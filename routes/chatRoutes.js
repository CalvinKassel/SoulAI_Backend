// SoulAI_Backend/routes/chatRoutes.js
import express from 'express';
const router = express.Router();

// Basic chat endpoints - mostly handled by SoulAI now
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    // This would typically get from ConversationModel
    // For now, return empty array
    res.json({
      success: true,
      messages: [],
      total: 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get chat history',
      details: error.message
    });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { userId, message, recipientId } = req.body;
    
    // Basic message sending logic
    // This is now mostly handled by SoulAI routes
    res.json({
      success: true,
      message: 'Message sent',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
  }
});

export default router;