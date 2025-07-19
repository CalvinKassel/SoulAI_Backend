// services/PushNotificationService.js - Final Fixed Backend Push Notifications
// Save in: backend/services/PushNotificationService.js

class PushNotificationService {
  constructor() {
    this.expo = null;
    this.admin = null;
    this.firebaseInitialized = false;
    
    this.initializeExpo();
    this.initializeFirebase();
    
    console.log('🔔 Push Notification Service initialized');
  }

  initializeExpo() {
    try {
      const { Expo } = require('expo-server-sdk');
      this.expo = new Expo();
      console.log('✅ Expo SDK initialized');
    } catch (error) {
      console.log('⚠️  Expo SDK not available:', error.message);
    }
  }

  initializeFirebase() {
    try {
      // Only initialize if credentials are available
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.log('⚠️  Firebase credentials not found, using Expo only');
        return;
      }

      const admin = require('firebase-admin');
      
      // Check if already initialized
      if (admin.apps.length === 0) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
      }
      
      this.admin = admin;
      this.firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      this.firebaseInitialized = false;
    }
  }

  async sendNotificationToUser(userId, notification) {
    try {
      // Import User model dynamically to avoid circular dependency
      const User = require('../models/mongodb/UserModel');
      
      const user = await User.findById(userId);
      if (!user || !user.pushTokens || user.pushTokens.length === 0) {
        console.log(`No push tokens found for user: ${userId}`);
        return { success: false, reason: 'No push tokens' };
      }

      // Check notification preferences
      if (!this.shouldSendNotification(user, notification.type)) {
        console.log(`Notification blocked by user preferences: ${notification.type}`);
        return { success: false, reason: 'User preferences' };
      }

      const results = [];
      
      for (const tokenData of user.pushTokens) {
        try {
          let result;
          
          if ((tokenData.platform === 'ios' || tokenData.platform === 'android') && this.expo) {
            // Use Expo for React Native
            result = await this.sendExpoNotification(tokenData.token, notification);
          } else if (tokenData.platform === 'web' && this.firebaseInitialized) {
            // Use Firebase for web
            result = await this.sendFirebaseNotification(tokenData.token, notification);
          } else {
            continue;
          }
          
          results.push({
            token: tokenData.token,
            platform: tokenData.platform,
            success: result.success,
            error: result.error
          });
          
        } catch (error) {
          console.error(`Error sending to token ${tokenData.token}:`, error);
          results.push({
            token: tokenData.token,
            platform: tokenData.platform,
            success: false,
            error: error.message
          });
        }
      }

      // Clean up invalid tokens
      await this.cleanupInvalidTokens(userId, results);

      return {
        success: true,
        results,
        successCount: results.filter(r => r.success).length,
        totalCount: results.length
      };

    } catch (error) {
      console.error('❌ Error sending notification to user:', error);
      return { success: false, error: error.message };
    }
  }

  async sendExpoNotification(token, notification) {
    try {
      if (!this.expo) {
        return { success: false, error: 'Expo SDK not available' };
      }

      if (!this.expo.isExpoPushToken(token)) {
        return { success: false, error: 'Invalid Expo push token' };
      }

      const message = {
        to: token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        priority: notification.priority || 'normal',
        ttl: notification.ttl || 2419200, // 4 weeks
        channelId: notification.channelId || 'default'
      };

      // Add badge if provided
      if (notification.badge !== undefined) {
        message.badge = notification.badge;
      }

      // Add category if provided
      if (notification.categoryId) {
        message.categoryId = notification.categoryId;
      }

      const chunks = this.expo.chunkPushNotifications([message]);
      const tickets = await this.expo.sendPushNotificationsAsync(chunks[0]);
      
      const ticket = tickets[0];
      
      if (ticket.status === 'error') {
        return { success: false, error: ticket.message };
      }

      return { success: true, ticket };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendFirebaseNotification(token, notification) {
    try {
      if (!this.firebaseInitialized || !this.admin) {
        return { success: false, error: 'Firebase not initialized' };
      }

      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: this.convertDataToStrings(notification.data || {}),
        webpush: {
          notification: {
            icon: notification.icon || '/icon-192x192.png',
            badge: notification.badge || '/badge-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: notification.requireInteraction || false
          }
        },
        android: {
          priority: 'high',
          notification: {
            channelId: notification.channelId || 'default',
            color: '#FF6B6B',
            sound: 'default'
          }
        },
        apns: {
          headers: {
            'apns-priority': '10'
          },
          payload: {
            aps: {
              sound: 'default',
              badge: notification.badge || 1
            }
          }
        }
      };

      // Add image if provided
      if (notification.imageUrl) {
        message.notification.imageUrl = notification.imageUrl;
      }

      // Add click action for web
      if (notification.link) {
        message.webpush.fcmOptions = {
          link: notification.link
        };
      }

      const response = await this.admin.messaging().send(message);
      return { success: true, messageId: response };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Convert all data values to strings for Firebase
  convertDataToStrings(data) {
    const stringData = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = String(value);
    }
    return stringData;
  }

  shouldSendNotification(user, notificationType) {
    const settings = user.notificationSettings || {};
    
    switch (notificationType) {
      case 'new_match':
        return settings.newMatches !== false;
      case 'new_message':
        return settings.newMessages !== false;
      case 'profile_view':
        return settings.profileViews !== false;
      case 'soulai_update':
        return settings.soulAIUpdates !== false;
      default:
        return true;
    }
  }

  async cleanupInvalidTokens(userId, results) {
    try {
      const User = require('../models/mongodb/UserModel');
      
      const invalidTokens = results
        .filter(result => !result.success && this.isTokenError(result.error))
        .map(result => result.token);

      if (invalidTokens.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { pushTokens: { token: { $in: invalidTokens } } }
        });
        
        console.log(`Removed ${invalidTokens.length} invalid tokens for user ${userId}`);
      }
    } catch (error) {
      console.error('Error cleaning up invalid tokens:', error);
    }
  }

  isTokenError(error) {
    const tokenErrors = [
      'DeviceNotRegistered',
      'InvalidRegistration',
      'NotRegistered',
      'registration-token-not-registered',
      'Invalid registration token'
    ];
    
    return tokenErrors.some(err => error && error.includes(err));
  }

  // Notification templates
  createMatchNotification(matchUser) {
    return {
      type: 'new_match',
      title: 'New Match! 💕',
      body: `You matched with ${matchUser.name}!`,
      data: {
        type: 'match',
        userId: String(matchUser.id || matchUser._id),
        screen: 'Matches'
      },
      badge: 1,
      categoryId: 'MATCH_CATEGORY'
    };
  }

  createMessageNotification(sender, message) {
    return {
      type: 'new_message',
      title: sender.name,
      body: message.length > 50 ? message.substring(0, 50) + '...' : message,
      data: {
        type: 'message',
        senderId: String(sender.id || sender._id),
        screen: 'Chat'
      },
      badge: 1,
      categoryId: 'MESSAGE_CATEGORY'
    };
  }

  createSuperLikeNotification() {
    return {
      type: 'new_match',
      title: 'Super Like! ⭐',
      body: 'Someone super liked you!',
      data: {
        type: 'super_like',
        screen: 'Discovery'
      },
      badge: 1,
      categoryId: 'LIKE_CATEGORY'
    };
  }

  createSoulAINotification(message, data = {}) {
    return {
      type: 'soulai_update',
      title: 'SoulAI Update 🧠',
      body: message,
      data: {
        type: 'soulai',
        ...this.convertDataToStrings(data),
        screen: 'SoulAI'
      },
      badge: 1,
      categoryId: 'SOULAI_CATEGORY'
    };
  }

  // Bulk notifications
  async sendBulkNotifications(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.sendNotificationToUser(
          notification.userId,
          notification.notification
        );
        results.push({
          userId: notification.userId,
          ...result
        });
      } catch (error) {
        results.push({
          userId: notification.userId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Test notification
  async sendTestNotification(userId) {
    const testNotification = {
      type: 'test',
      title: 'SoulAI Test Notification',
      body: 'If you can see this, push notifications are working! 🎉',
      data: {
        type: 'test',
        timestamp: String(Date.now())
      }
    };

    return await this.sendNotificationToUser(userId, testNotification);
  }

  // Health check
  async healthCheck() {
    return {
      expo: !!this.expo,
      firebase: this.firebaseInitialized,
      status: 'operational'
    };
  }
}

module.exports = new PushNotificationService();

// ==========================================

// Frontend Push Notification Setup - Final Fixed
// Save in: frontend/src/services/PushNotificationClient.js

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditional imports to avoid errors if packages aren't installed
let Notifications = null;
let Constants = null;

try {
  Notifications = require('expo-notifications');
  Constants = require('expo-constants');
  
  // Configure notification behavior if available
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  console.log('⚠️ Expo Notifications not available:', error.message);
}

class PushNotificationClient {
  constructor() {
    this.token = null;
    this.listeners = [];
    this.isInitialized = false;
    this.notificationsAvailable = !!Notifications;
  }

  async initialize() {
    try {
      if (this.isInitialized || !this.notificationsAvailable) {
        console.log('Push notifications not available or already initialized');
        return false;
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Push notification permissions denied');
        return false;
      }

      // Get token
      this.token = await this.getExpoPushToken();

      // Set up listeners
      this.setupListeners();

      // Configure notification categories
      await this.setupNotificationCategories();

      this.isInitialized = true;
      console.log('✅ Push notifications initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      return false;
    }
  }

  async requestPermissions() {
    if (!Device.isDevice || !Notifications) {
      console.log('Push notifications only work on physical devices with Expo Notifications');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permissions not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  async getExpoPushToken() {
    try {
      if (!Notifications) {
        console.log('Notifications not available');
        return null;
      }

      // Check if we have a cached token
      const cachedToken = await AsyncStorage.getItem('expoPushToken');
      if (cachedToken) {
        console.log('📱 Using cached Expo push token');
        return cachedToken;
      }

      let projectId = null;
      
      if (Constants) {
        projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                   Constants.manifest?.extra?.eas?.projectId ||
                   Constants.manifest2?.extra?.eas?.projectId;
      }

      if (!projectId) {
        console.warn('⚠️ No EAS project ID found, using default configuration');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      const token = tokenData.data;

      // Cache the token
      await AsyncStorage.setItem('expoPushToken', token);
      
      console.log('📱 Expo push token obtained:', token);
      return token;

    } catch (error) {
      console.error('Error getting Expo push token:', error);
      return null;
    }
  }

  setupListeners() {
    if (!Notifications) return;

    try {
      // Notification received while app is running
      this.listeners.push(
        Notifications.addNotificationReceivedListener(notification => {
          console.log('🔔 Notification received:', notification);
          this.handleNotificationReceived(notification);
        })
      );

      // Notification tapped/opened
      this.listeners.push(
        Notifications.addNotificationResponseReceivedListener(response => {
          console.log('👆 Notification tapped:', response);
          this.handleNotificationTapped(response);
        })
      );
    } catch (error) {
      console.error('Error setting up listeners:', error);
    }
  }

  async setupNotificationCategories() {
    if (!Notifications) return;

    try {
      await Notifications.setNotificationCategoryAsync('MATCH_CATEGORY', [
        {
          identifier: 'VIEW_MATCH',
          buttonTitle: 'View Match',
          options: { opensAppToForeground: true }
        },
        {
          identifier: 'DISMISS',
          buttonTitle: 'Dismiss',
          options: { opensAppToForeground: false }
        }
      ]);

      await Notifications.setNotificationCategoryAsync('MESSAGE_CATEGORY', [
        {
          identifier: 'REPLY',
          buttonTitle: 'Reply',
          options: { opensAppToForeground: true }
        },
        {
          identifier: 'VIEW_CHAT',
          buttonTitle: 'View Chat',
          options: { opensAppToForeground: true }
        }
      ]);

      await Notifications.setNotificationCategoryAsync('LIKE_CATEGORY', [
        {
          identifier: 'VIEW_PROFILE',
          buttonTitle: 'View Profile',
          options: { opensAppToForeground: true }
        }
      ]);

    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  }

  handleNotificationReceived(notification) {
    // Custom handling for in-app notifications
    const { type } = notification.request.content.data || {};
    
    switch (type) {
      case 'message':
        // Update chat state, show in-app notification
        break;
      case 'match':
        // Update matches count, show celebration
        break;
      case 'soulai':
        // Update SoulAI indicator
        break;
    }
  }

  handleNotificationTapped(response) {
    const { data } = response.notification.request.content;
    const { actionIdentifier } = response;
    
    // Navigate based on notification data
    switch (data?.type) {
      case 'match':
        if (actionIdentifier === 'VIEW_MATCH') {
          console.log('Navigate to matches screen');
        }
        break;
      case 'message':
        if (actionIdentifier === 'VIEW_CHAT') {
          console.log('Navigate to chat screen');
        }
        break;
      case 'soulai':
        console.log('Navigate to SoulAI screen');
        break;
    }
  }

  async registerToken(userId) {
    try {
      if (!this.token) {
        console.log('No push token available');
        return false;
      }

      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        console.log('No auth token available');
        return false;
      }

      const API_BASE_URL = __DEV__ 
        ? Platform.OS === 'ios' ? 'http://localhost:3000' : 'http://10.0.2.2:3000'
        : 'https://your-production-url.com';

      const response = await fetch(`${API_BASE_URL}/api/users/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          token: this.token,
          platform: Platform.OS,
          userId
        })
      });

      if (response.ok) {
        console.log('✅ Push token registered successfully');
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to register push token:', errorData);
        return false;
      }

    } catch (error) {
      console.error('Error registering push token:', error);
      return false;
    }
  }

  async scheduleLocalNotification(title, body, data = {}, delay = 0) {
    if (!Notifications) return null;

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default'
        },
        trigger: delay > 0 ? { seconds: delay } : null
      });

      return identifier;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  }

  async clearAllNotifications() {
    if (!Notifications) return;

    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  async setBadgeCount(count) {
    if (!Notifications) return;

    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  cleanup() {
    this.listeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.listeners = [];
  }

  getToken() {
    return this.token;
  }

  isAvailable() {
    return this.notificationsAvailable;
  }
}

export default new PushNotificationClient();