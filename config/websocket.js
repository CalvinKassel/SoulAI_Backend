// config/websocket.js - Complete WebSocket Server
// Save in: backend/config/websocket.js

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/mongodb/UserModel');
const Match = require('../models/mongodb/MatchModel');
const Message = require('../models/mongodb/MessageModel');

class WebSocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
    this.rooms = new Map(); // matchId -> [userId1, userId2]
    this.typingUsers = new Map(); // matchId -> Set of typing userIds

    this.setupSocketEvents();
    console.log('🔗 WebSocket service initialized');
  }

  setupSocketEvents() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.userId}`);
      
      // Store connection
      this.connectedUsers.set(socket.userId, socket.id);
      this.userSockets.set(socket.id, socket.userId);

      // Update user online status
      this.updateUserOnlineStatus(socket.userId, true);

      // Join user to their personal room for notifications
      socket.join(`user_${socket.userId}`);

      // Socket event handlers
      this.setupUserEvents(socket);
      this.setupMatchEvents(socket);
      this.setupChatEvents(socket);
      this.setupSoulAIEvents(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`📴 User disconnected: ${socket.userId}`);
        this.handleUserDisconnect(socket);
      });
    });
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('No authentication token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.error('❌ Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  }

  setupUserEvents(socket) {
    // User presence updates
    socket.on('user:update_status', async (data) => {
      try {
        await this.updateUserOnlineStatus(socket.userId, data.isOnline);
        
        // Notify connections about status change
        this.notifyUserConnections(socket.userId, 'user:status_changed', {
          userId: socket.userId,
          isOnline: data.isOnline,
          lastActive: new Date()
        });
      } catch (error) {
        console.error('❌ Error updating user status:', error);
      }
    });

    // Location updates
    socket.on('user:update_location', async (data) => {
      try {
        await User.findByIdAndUpdate(socket.userId, {
          'location.coordinates': [data.longitude, data.latitude],
          'location.city': data.city,
          'location.state': data.state
        });

        console.log(`📍 Location updated for user: ${socket.userId}`);
      } catch (error) {
        console.error('❌ Error updating location:', error);
      }
    });
  }

  setupMatchEvents(socket) {
    // User likes another user
    socket.on('match:like_user', async (data) => {
      try {
        const { likedUserId, isSuperLike = false } = data;
        
        const matchResult = await this.processUserLike(socket.userId, likedUserId, isSuperLike);
        
        if (matchResult.isMatch) {
          // It's a match! Notify both users
          const matchData = {
            match: matchResult.match,
            message: 'It\'s a match! 💕',
            compatibilityScore: matchResult.match.compatibilityScore
          };

          this.notifyUser(socket.userId, 'match:new_match', matchData);
          this.notifyUser(likedUserId, 'match:new_match', matchData);

          // Create match room
          this.createMatchRoom(matchResult.match._id, socket.userId, likedUserId);
        } else {
          // Just notify the liked user
          this.notifyUser(likedUserId, 'match:received_like', {
            fromUserId: socket.userId,
            isSuperLike,
            message: isSuperLike ? 'Someone super liked you! ⭐' : 'Someone likes you! 👍'
          });
        }

      } catch (error) {
        console.error('❌ Error processing like:', error);
        socket.emit('error', { message: 'Failed to process like' });
      }
    });

    // Pass on a user
    socket.on('match:pass_user', async (data) => {
      try {
        const { passedUserId } = data;
        // Log the pass for analytics
        console.log(`👎 User ${socket.userId} passed on ${passedUserId}`);
      } catch (error) {
        console.error('❌ Error processing pass:', error);
      }
    });

    // Join match conversation room
    socket.on('match:join_conversation', (data) => {
      const { matchId } = data;
      socket.join(`match_${matchId}`);
      console.log(`💬 User ${socket.userId} joined match conversation: ${matchId}`);
    });

    // Leave match conversation room
    socket.on('match:leave_conversation', (data) => {
      const { matchId } = data;
      socket.leave(`match_${matchId}`);
      console.log(`👋 User ${socket.userId} left match conversation: ${matchId}`);
    });

    // Unmatch with user
    socket.on('match:unmatch', async (data) => {
      try {
        const { matchId } = data;
        
        const match = await Match.findById(matchId);
        if (!match || !match.isUserInMatch(socket.userId)) {
          socket.emit('error', { message: 'Invalid match or unauthorized' });
          return;
        }

        // Update match status
        await Match.findByIdAndUpdate(matchId, { status: 'unmatched' });
        
        // Notify the other user
        const otherUserId = match.getOtherUser(socket.userId);
        this.notifyUser(otherUserId, 'match:unmatched', {
          matchId,
          message: 'Your match has ended'
        });

        // Remove from rooms
        this.io.to(`match_${matchId}`).emit('match:conversation_ended', { matchId });
        this.io.in(`match_${matchId}`).socketsLeave(`match_${matchId}`);

      } catch (error) {
        console.error('❌ Error unmatching:', error);
        socket.emit('error', { message: 'Failed to unmatch' });
      }
    });
  }

  setupChatEvents(socket) {
    // Send message in match conversation
    socket.on('chat:send_message', async (data) => {
      try {
        const { matchId, content, messageType = 'text', attachments = [] } = data;
        
        // Validate match and user participation
        const match = await Match.findById(matchId).populate('user1 user2');
        if (!match || !match.isUserInMatch(socket.userId)) {
          socket.emit('error', { message: 'Invalid match or unauthorized' });
          return;
        }

        const recipientId = match.getOtherUser(socket.userId);

        // Create message
        const message = new Message({
          match: matchId,
          sender: socket.userId,
          recipient: recipientId,
          content,
          messageType,
          attachments
        });

        await message.save();

        // Update match interaction
        await Match.findByIdAndUpdate(matchId, {
          lastMessageAt: new Date(),
          $inc: { messageCount: 1 },
          isConversationActive: true
        });

        // Populate sender info for response
        await message.populate('sender', 'name photos');

        // Emit to match room
        this.io.to(`match_${matchId}`).emit('chat:new_message', {
          message: message.toJSON(),
          match: { id: matchId }
        });

        // Notify recipient if they're not in the room
        const recipientSocketId = this.connectedUsers.get(recipientId.toString());
        if (recipientSocketId) {
          const recipientSocket = this.io.sockets.sockets.get(recipientSocketId);
          if (!recipientSocket || !recipientSocket.rooms.has(`match_${matchId}`)) {
            this.notifyUser(recipientId, 'chat:new_message_notification', {
              matchId,
              fromUser: socket.user.name,
              message: content.length > 50 ? content.substring(0, 50) + '...' : content,
              messageType
            });
          }
        }

      } catch (error) {
        console.error('❌ Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('chat:typing_start', (data) => {
      const { matchId } = data;
      
      if (!this.typingUsers.has(matchId)) {
        this.typingUsers.set(matchId, new Set());
      }
      this.typingUsers.get(matchId).add(socket.userId);

      socket.to(`match_${matchId}`).emit('chat:user_typing', {
        userId: socket.userId,
        userName: socket.user.name
      });
    });

    socket.on('chat:typing_stop', (data) => {
      const { matchId } = data;
      
      if (this.typingUsers.has(matchId)) {
        this.typingUsers.get(matchId).delete(socket.userId);
        if (this.typingUsers.get(matchId).size === 0) {
          this.typingUsers.delete(matchId);
        }
      }

      socket.to(`match_${matchId}`).emit('chat:user_stopped_typing', {
        userId: socket.userId
      });
    });

    // Mark messages as read
    socket.on('chat:mark_read', async (data) => {
      try {
        const { matchId, messageIds } = data;
        
        // Update message read status
        await Message.updateMany(
          { 
            _id: { $in: messageIds },
            match: matchId,
            recipient: socket.userId 
          },
          { 
            status: 'read',
            readAt: new Date()
          }
        );
        
        // Notify sender about read receipt
        socket.to(`match_${matchId}`).emit('chat:messages_read', {
          messageIds,
          readBy: socket.userId,
          readAt: new Date()
        });

      } catch (error) {
        console.error('❌ Error marking messages as read:', error);
      }
    });

    // Delete message
    socket.on('chat:delete_message', async (data) => {
      try {
        const { messageId, matchId } = data;
        
        const message = await Message.findOne({
          _id: messageId,
          sender: socket.userId,
          match: matchId
        });

        if (!message) {
          socket.emit('error', { message: 'Message not found or unauthorized' });
          return;
        }

        await Message.findByIdAndUpdate(messageId, { isDeleted: true });

        // Notify both users
        this.io.to(`match_${matchId}`).emit('chat:message_deleted', {
          messageId,
          deletedBy: socket.userId
        });

      } catch (error) {
        console.error('❌ Error deleting message:', error);
      }
    });
  }

  setupSoulAIEvents(socket) {
    // SoulAI conversation events
    socket.on('soulai:send_message', async (data) => {
      try {
        const { message } = data;
        
        // Process through SoulAI
        const response = await this.processSoulAIMessage(socket.userId, message);
        
        // Send response back to user
        socket.emit('soulai:message_response', {
          response: response.text,
          insights: response.insights,
          profileUpdated: response.profileUpdated,
          nextSteps: response.nextSteps
        });

        // Update user's SoulAI profile
        await User.findByIdAndUpdate(socket.userId, {
          'soulAIProfile.lastSoulAIInteraction': new Date(),
          'soulAIProfile.profileCompleteness': response.profileCompleteness,
          'soulAIProfile.readyForMatching': response.readyForMatches,
          $push: {
            'soulAIProfile.conversationHistory': {
              message,
              response: response.text,
              insights: response.insights,
              timestamp: new Date()
            }
          }
        });

        // If user is ready for matches, notify them
        if (response.readyForMatches) {
          socket.emit('soulai:ready_for_matches', {
            message: 'You\'re ready to start meeting amazing people! 🎯',
            profileCompleteness: response.profileCompleteness
          });
        }

      } catch (error) {
        console.error('❌ Error processing SoulAI message:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // Request match suggestions
    socket.on('soulai:request_matches', async () => {
      try {
        const matches = await this.findUserMatches(socket.userId);
        
        socket.emit('soulai:match_suggestions', {
          matches,
          count: matches.length,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('❌ Error getting match suggestions:', error);
      }
    });

    // Get conversation coaching
    socket.on('soulai:request_coaching', async (data) => {
      try {
        const { matchId, messageContent } = data;
        
        const coaching = await this.getSoulAICoaching(socket.userId, matchId, messageContent);
        
        socket.emit('soulai:coaching_response', {
          suggestions: coaching.suggestions,
          sentiment: coaching.sentiment,
          confidence: coaching.confidence
        });

      } catch (error) {
        console.error('❌ Error getting SoulAI coaching:', error);
      }
    });
  }

  // Utility methods
  async updateUserOnlineStatus(userId, isOnline) {
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline,
        lastActive: new Date()
      });
    } catch (error) {
      console.error('❌ Error updating online status:', error);
    }
  }

  notifyUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  async notifyUserConnections(userId, event, data) {
    try {
      // Get user's active matches
      const matches = await Match.find({
        $or: [{ user1: userId }, { user2: userId }],
        status: 'matched'
      });

      // Notify connected users from matches
      matches.forEach(match => {
        const otherUserId = match.getOtherUser(userId);
        this.notifyUser(otherUserId, event, data);
      });
    } catch (error) {
      console.error('❌ Error notifying user connections:', error);
    }
  }

  createMatchRoom(matchId, userId1, userId2) {
    this.rooms.set(matchId.toString(), [userId1.toString(), userId2.toString()]);
    
    // Add users to room if they're connected
    const socket1 = this.connectedUsers.get(userId1.toString());
    const socket2 = this.connectedUsers.get(userId2.toString());
    
    if (socket1) {
      this.io.sockets.sockets.get(socket1)?.join(`match_${matchId}`);
    }
    if (socket2) {
      this.io.sockets.sockets.get(socket2)?.join(`match_${matchId}`);
    }
  }

  handleUserDisconnect(socket) {
    // Clear typing indicators
    this.typingUsers.forEach((typingSet, matchId) => {
      if (typingSet.has(socket.userId)) {
        typingSet.delete(socket.userId);
        socket.to(`match_${matchId}`).emit('chat:user_stopped_typing', {
          userId: socket.userId
        });
      }
    });

    this.connectedUsers.delete(socket.userId);
    this.userSockets.delete(socket.id);
    
    // Update user offline status after a delay
    setTimeout(async () => {
      if (!this.connectedUsers.has(socket.userId)) {
        await this.updateUserOnlineStatus(socket.userId, false);
      }
    }, 30000); // 30 second grace period
  }

  // Service integration methods
  async processUserLike(userId, likedUserId, isSuperLike = false) {
    try {
      // Check if match already exists
      let match = await Match.findOne({
        $or: [
          { user1: userId, user2: likedUserId },
          { user1: likedUserId, user2: userId }
        ]
      });

      if (!match) {
        // Create new match
        match = new Match({
          user1: userId,
          user2: likedUserId,
          status: 'pending'
        });
        await match.save();
      }

      // Add the like
      const existingLike = match.likes.find(like => like.userId.toString() === userId);
      if (!existingLike) {
        match.likes.push({
          userId,
          superLike: isSuperLike,
          likedAt: new Date()
        });
      }

      // Check if it's a mutual match
      const isMatch = match.likes.length === 2;
      if (isMatch) {
        match.status = 'matched';
        match.matchedAt = new Date();
        
        // Calculate compatibility score (integrate with your SoulAI service)
        match.compatibilityScore = await this.calculateCompatibilityScore(userId, likedUserId);
      }

      await match.save();

      return {
        isMatch,
        match: await match.populate('user1 user2', 'name age photos')
      };
    } catch (error) {
      console.error('❌ Error processing user like:', error);
      throw error;
    }
  }

  async calculateCompatibilityScore(userId1, userId2) {
    // Placeholder - integrate with your SoulAI compatibility calculation
    return Math.floor(Math.random() * 30) + 70; // 70-100 score
  }

  async processSoulAIMessage(userId, message) {
    // Placeholder - integrate with your SoulAI orchestrator
    return {
      text: "Thanks for sharing! I'm learning more about what you're looking for in a partner.",
      insights: { personality: "empathetic", interests: ["travel", "books"] },
      profileUpdated: true,
      profileCompleteness: 75,
      readyForMatches: true,
      nextSteps: ["Add more photos", "Complete interests section"]
    };
  }

  async findUserMatches(userId) {
    // Placeholder - integrate with your matching service
    const potentialMatches = await User.find({
      _id: { $ne: userId },
      'soulAIProfile.readyForMatching': true
    }).limit(10);
    
    return potentialMatches;
  }

  async getSoulAICoaching(userId, matchId, messageContent) {
    // Placeholder - integrate with your SoulAI coaching
    return {
      suggestions: [
        "Try asking an open-ended question to keep the conversation flowing",
        "Share something personal to create deeper connection"
      ],
      sentiment: "positive",
      confidence: 0.85
    };
  }

  // Get connection statistics
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.rooms.size,
      totalConnections: this.io.sockets.sockets.size,
      typingUsers: Array.from(this.typingUsers.entries()).map(([matchId, users]) => ({
        matchId,
        userCount: users.size
      }))
    };
  }

  // Broadcast to all connected users
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Send to specific room
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  // Admin functions
  async kickUser(userId, reason = 'Violation of terms') {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('admin:kicked', { reason });
      this.io.sockets.sockets.get(socketId)?.disconnect(true);
    }
  }

  async broadcastSystemMessage(message) {
    this.broadcastToAll('system:message', {
      message,
      timestamp: new Date(),
      type: 'system'
    });
  }
}

module.exports = WebSocketService;