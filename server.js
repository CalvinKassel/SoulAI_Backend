// SoulAI_Backend/server.js
// Simplified server that will start immediately

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      soulAI: 'active',
      websocket: 'active'
    }
  });
});

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'SoulAI Backend is running!',
    timestamp: new Date()
  });
});

// Database connection (optional for now)
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');
    } else {
      console.log('⚠️  No MongoDB URI provided, running without database');
    }
  } catch (error) {
    console.log('⚠️  MongoDB connection failed, running without database:', error.message);
  }
};

// Import routes conditionally (only if files exist)
const loadRoutes = async () => {
  try {
    // Try to load each route file
    const routeFiles = [
      { path: './routes/authRoutes.js', route: '/api/auth' },
      { path: './routes/chatRoutes.js', route: '/api/chat' },
      { path: './routes/matchRoutes.js', route: '/api/matches' },
      { path: './routes/uploadRoutes.js', route: '/api/upload' },
      { path: './routes/soulaiRoutes.js', route: '/api/soulai' }
    ];

    for (const { path: routePath, route } of routeFiles) {
      try {
        const routeModule = await import(routePath);
        app.use(route, routeModule.default);
        console.log(`✅ Loaded route: ${route}`);
      } catch (error) {
        console.log(`⚠️  Route not found: ${route} (${error.message})`);
      }
    }
  } catch (error) {
    console.log('⚠️  Error loading routes:', error.message);
  }
};

// Mock SoulAI service (if the real one isn't available)
let mockSoulAI = {
  processMessage: async (userId, message) => {
    return {
      success: true,
      response: `I understand you're saying: "${message}". This is a mock response while we set up the full AI system.`,
      type: 'mock',
      metadata: {
        personalityInsights: { confidence: 0.5 },
        conversationQuality: { overallScore: 0.7 },
        suggestions: ['Tell me more about yourself', 'What are you passionate about?']
      }
    };
  },
  initializeSoulAI: async (userId) => {
    return {
      success: true,
      welcomeMessage: `Hi! I'm SoulAI. I'm currently in development mode, but I'm here to chat with you!`
    };
  }
};

// Try to load real SoulAI service
let soulAIService = mockSoulAI;
try {
  const soulAIModule = await import('./services/SoulAIIntegrationService.js');
  soulAIService = soulAIModule.soulAIService;
  console.log('✅ SoulAI Integration Service loaded');
} catch (error) {
  console.log('⚠️  Using mock SoulAI service:', error.message);
}

// WebSocket handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Handle SoulAI chat messages
  socket.on('soulai_message', async (data) => {
    try {
      const { userId, message, context } = data;
      
      // Process through SoulAI (real or mock)
      const result = await soulAIService.processMessage(userId, message, context);
      
      // Emit AI response back to user
      socket.emit('soulai_response', {
        success: result.success,
        response: result.response,
        type: result.type,
        metadata: result.metadata,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('SoulAI message error:', error);
      socket.emit('soulai_error', {
        error: 'Failed to process message',
        fallback: "I'm reflecting on what you've shared. Tell me more about yourself."
      });
    }
  });

  // Handle user initialization
  socket.on('initialize_soulai', async (data) => {
    try {
      const { userId } = data;
      const result = await soulAIService.initializeSoulAI(userId);
      
      socket.emit('soulai_initialized', {
        success: result.success,
        welcomeMessage: result.welcomeMessage || result.fallbackMessage,
        error: result.error
      });
      
    } catch (error) {
      console.error('SoulAI initialization error:', error);
      socket.emit('initialization_error', { error: error.message });
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    availableRoutes: [
      '/health',
      '/api/test',
      '/api/auth (if available)',
      '/api/chat (if available)', 
      '/api/matches (if available)',
      '/api/upload (if available)',
      '/api/soulai (if available)'
    ]
  });
});

const PORT = process.env.PORT || 3001;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Load routes
    await loadRoutes();
    
    // Start listening
    server.listen(PORT, () => {
      console.log(`🚀 SoulAI Server running on port ${PORT}`);
      console.log(`🧠 AI System: ${soulAIService === mockSoulAI ? 'Mock Mode' : 'Production Mode'}`);
      console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
      console.log(`🌐 WebSocket: Active`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  // Close database connection
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  
  // Close server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

export default app;