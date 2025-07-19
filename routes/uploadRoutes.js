// SoulAI_Backend/routes/uploadRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Upload profile photo
router.post('/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      photoUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to upload photo',
      details: error.message
    });
  }
});

// Upload multiple photos
router.post('/photos', upload.array('photos', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const photoUrls = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));
    
    res.json({
      success: true,
      photos: photoUrls,
      total: photoUrls.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to upload photos',
      details: error.message
    });
  }
});

// Delete photo
router.delete('/photo/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: 'Photo deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete photo',
      details: error.message
    });
  }
});

export default router;