// services/FileUploadService.js - Fixed Backend File Upload Service
// Save in: backend/services/FileUploadService.js

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Cloudinary setup (optional, only if credentials are provided)
let cloudinary = null;
let CloudinaryStorage = null;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  try {
    cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage: CS } = require('multer-storage-cloudinary');
    CloudinaryStorage = CS;
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    console.log('✅ Cloudinary configured');
  } catch (error) {
    console.log('⚠️ Cloudinary not available, using local storage');
  }
}

// Sharp for image processing (optional)
let sharp = null;
try {
  sharp = require('sharp');
  console.log('✅ Sharp available for image processing');
} catch (error) {
  console.log('⚠️ Sharp not available, skipping image processing');
}

class FileUploadService {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    this.allowedVideoTypes = ['video/mp4', 'video/quicktime'];
    
    this.setupMulter();
    console.log('📁 File Upload Service initialized');
  }

  async setupMulter() {
    let storage;

    // Use Cloudinary in production if available
    if (cloudinary && CloudinaryStorage && process.env.NODE_ENV === 'production') {
      storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: async (req, file) => {
          const folder = this.getUploadFolder(file.mimetype);
          const format = this.getFileFormat(file.mimetype);
          
          return {
            folder: `soulai/${folder}`,
            format: format,
            public_id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transformation: this.getTransformation(file.mimetype)
          };
        }
      });
    } else {
      // Use local storage
      storage = multer.diskStorage({
        destination: async (req, file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads', this.getUploadFolder(file.mimetype));
          try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
          } catch (error) {
            cb(error);
          }
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const extension = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${extension}`);
        }
      });
    }

    this.upload = multer({
      storage: storage,
      limits: {
        fileSize: this.maxFileSize,
        files: 6 // Max 6 files per upload
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  fileFilter(req, file, cb) {
    const isImage = this.allowedImageTypes.includes(file.mimetype);
    const isVideo = this.allowedVideoTypes.includes(file.mimetype);
    
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
  }

  getUploadFolder(mimetype) {
    if (this.allowedImageTypes.includes(mimetype)) {
      return 'photos';
    } else if (this.allowedVideoTypes.includes(mimetype)) {
      return 'videos';
    }
    return 'misc';
  }

  getFileFormat(mimetype) {
    switch (mimetype) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'video/mp4':
        return 'mp4';
      case 'video/quicktime':
        return 'mov';
      default:
        return 'auto';
    }
  }

  getTransformation(mimetype) {
    if (this.allowedImageTypes.includes(mimetype)) {
      return [
        { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
        { fetch_format: 'auto' }
      ];
    } else if (this.allowedVideoTypes.includes(mimetype)) {
      return [
        { width: 720, height: 720, crop: 'limit', quality: 'auto:good' },
        { video_codec: 'h264' }
      ];
    }
    return [];
  }

  // Photo upload endpoint
  async uploadPhotos(req, res) {
    try {
      const uploadHandler = this.upload.array('photos', 6);
      
      uploadHandler(req, res, async (err) => {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({
            error: err.message || 'File upload failed'
          });
        }

        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            error: 'No files uploaded'
          });
        }

        try {
          const processedFiles = await this.processUploadedFiles(req.files, req.user.id);
          
          res.json({
            success: true,
            files: processedFiles,
            message: `${processedFiles.length} file(s) uploaded successfully`
          });

        } catch (error) {
          console.error('File processing error:', error);
          res.status(500).json({
            error: 'Failed to process uploaded files'
          });
        }
      });

    } catch (error) {
      console.error('Upload endpoint error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async processUploadedFiles(files, userId) {
    const processedFiles = [];

    for (const file of files) {
      try {
        let fileData;

        if (cloudinary && file.public_id) {
          // Cloudinary file
          fileData = {
            id: file.public_id,
            url: file.secure_url || file.path,
            originalUrl: file.secure_url || file.path,
            thumbnail: this.generateThumbnailUrl(file.secure_url || file.path),
            type: file.resource_type || 'image',
            format: file.format || path.extname(file.originalname).slice(1),
            width: file.width || null,
            height: file.height || null,
            size: file.bytes || file.size,
            uploadedAt: new Date()
          };
        } else {
          // Local file
          fileData = await this.processLocalFile(file, userId);
        }

        processedFiles.push(fileData);

      } catch (error) {
        console.error(`Error processing file ${file.filename}:`, error);
        // Continue processing other files
      }
    }

    return processedFiles;
  }

  async processLocalFile(file, userId) {
    try {
      const inputPath = file.path;
      const filename = path.parse(file.filename).name;
      const extension = path.extname(file.filename);
      
      let fileData = {
        id: filename,
        url: `/uploads/${this.getUploadFolder(file.mimetype)}/${file.filename}`,
        originalUrl: `/uploads/${this.getUploadFolder(file.mimetype)}/${file.filename}`,
        type: this.allowedImageTypes.includes(file.mimetype) ? 'image' : 'video',
        format: extension.slice(1),
        size: file.size,
        uploadedAt: new Date()
      };

      // Process with Sharp if available and it's an image
      if (sharp && this.allowedImageTypes.includes(file.mimetype)) {
        try {
          const processedImages = await this.processWithSharp(inputPath, filename, userId);
          fileData = { ...fileData, ...processedImages };
        } catch (sharpError) {
          console.error('Sharp processing failed, using original file:', sharpError);
          // Fall back to original file
        }
      }

      return fileData;

    } catch (error) {
      console.error('Error processing local file:', error);
      throw error;
    }
  }

  async processWithSharp(inputPath, filename, userId) {
    const outputDir = path.join(process.cwd(), 'uploads', 'processed', userId);
    await fs.mkdir(outputDir, { recursive: true });

    // Generate different sizes
    const sizes = [
      { name: 'original', width: 800, height: 800 },
      { name: 'thumbnail', width: 200, height: 200 },
      { name: 'medium', width: 400, height: 400 }
    ];

    const processedImages = {};

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `${filename}_${size.name}.jpg`);
      
      await sharp(inputPath)
        .resize(size.width, size.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(outputPath);

      processedImages[size.name] = `/uploads/processed/${userId}/${filename}_${size.name}.jpg`;
    }

    // Get image metadata
    const metadata = await sharp(inputPath).metadata();

    return {
      url: processedImages.original,
      originalUrl: processedImages.original,
      thumbnail: processedImages.thumbnail,
      medium: processedImages.medium,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    };
  }

  generateThumbnailUrl(originalUrl) {
    if (cloudinary && originalUrl.includes('cloudinary')) {
      // Cloudinary transformation for thumbnail
      return originalUrl.replace('/upload/', '/upload/w_200,h_200,c_fill,g_face/');
    }
    // For local files, assume thumbnail was generated
    return originalUrl.replace(/\.(jpg|jpeg|png|webp)$/i, '_thumbnail.jpg');
  }

  // Delete file
  async deleteFile(fileId, userId) {
    try {
      if (cloudinary && fileId.includes('/')) {
        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(fileId);
        return result.result === 'ok';
      } else {
        // Delete local files
        const userDir = path.join(process.cwd(), 'uploads', 'processed', userId);
        try {
          const files = await fs.readdir(userDir);
          const filesToDelete = files.filter(file => file.startsWith(fileId));
          
          for (const file of filesToDelete) {
            await fs.unlink(path.join(userDir, file));
          }
          
          return true;
        } catch (error) {
          // Directory might not exist, that's ok
          console.log('No processed files to delete for:', fileId);
          return true;
        }
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Generate upload signature for direct client uploads (optional)
  generateUploadSignature(params) {
    if (!cloudinary) {
      throw new Error('Cloudinary not configured');
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      timestamp,
      folder: 'soulai/photos',
      ...params
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY
    };
  }

  // Validate uploaded images
  async validateImage(file) {
    try {
      let metadata;
      
      if (sharp) {
        metadata = await sharp(file.buffer || file.path).metadata();
      } else {
        // Basic validation without Sharp
        metadata = {
          width: 800, // Default assumption
          height: 600,
          format: path.extname(file.originalname).slice(1)
        };
      }
      
      const validations = {
        minWidth: 200,
        minHeight: 200,
        maxWidth: 4000,
        maxHeight: 4000,
        maxFileSize: this.maxFileSize
      };

      const errors = [];

      if (metadata.width && metadata.width < validations.minWidth) {
        errors.push(`Image width must be at least ${validations.minWidth}px`);
      }
      
      if (metadata.height && metadata.height < validations.minHeight) {
        errors.push(`Image height must be at least ${validations.minHeight}px`);
      }
      
      if (metadata.width && metadata.width > validations.maxWidth) {
        errors.push(`Image width must not exceed ${validations.maxWidth}px`);
      }
      
      if (metadata.height && metadata.height > validations.maxHeight) {
        errors.push(`Image height must not exceed ${validations.maxHeight}px`);
      }

      if (file.size > validations.maxFileSize) {
        errors.push(`File size must not exceed ${validations.maxFileSize / 1024 / 1024}MB`);
      }

      return {
        valid: errors.length === 0,
        errors,
        metadata
      };

    } catch (error) {
      return {
        valid: false,
        errors: ['Invalid image file'],
        metadata: null
      };
    }
  }

  // Get upload middleware
  getUploadMiddleware() {
    return {
      single: (fieldName) => this.upload.single(fieldName),
      array: (fieldName, maxCount) => this.upload.array(fieldName, maxCount),
      fields: (fields) => this.upload.fields(fields)
    };
  }

  // Health check
  async healthCheck() {
    return {
      cloudinary: !!cloudinary,
      sharp: !!sharp,
      maxFileSize: this.maxFileSize,
      allowedTypes: [...this.allowedImageTypes, ...this.allowedVideoTypes]
    };
  }
}

module.exports = new FileUploadService();

// ==========================================

// Frontend Image Upload Component - Fixed
// Save in: frontend/src/components/ImageUpload.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'ios' ? 'http://localhost:3000' : 'http://10.0.2.2:3000'
  : 'https://your-production-url.com';

const ImageUpload = ({ photos = [], onPhotosUpdate, maxPhotos = 6 }) => {
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and photo library access are needed to upload photos.'
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const showImagePicker = () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Maximum Photos', `You can only upload ${maxPhotos} photos.`);
      return;
    }

    Alert.alert(
      'Select Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Photo Library', onPress: openImageLibrary },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAndUploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async () => {
    try {
      const remainingSlots = maxPhotos - photos.length;
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: remainingSlots > 1,
        selectionLimit: remainingSlots,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        for (const asset of result.assets) {
          await processAndUploadImage(asset);
        }
      }
    } catch (error) {
      console.error('Image library error:', error);
      Alert.alert('Error', 'Failed to open photo library');
    }
  };

  const processAndUploadImage = async (asset) => {
    try {
      setUploading(true);
      
      // Resize and compress image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 800, height: 800 } }],
        { 
          compress: 0.8, 
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );

      // Upload to server
      await uploadImageToServer(manipulatedImage);
      
    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setUploading(false);
    }
  };

  const uploadImageToServer = async (image) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token');
      }

      const formData = new FormData();
      formData.append('photos', {
        uri: image.uri,
        type: 'image/jpeg',
        name: `photo_${Date.now()}.jpg`,
      });

      const response = await fetch(`${API_BASE_URL}/api/upload/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.files && result.files.length > 0) {
        const newPhotos = [...photos, ...result.files];
        onPhotosUpdate(newPhotos);
        Alert.alert('Success', 'Photo uploaded successfully!');
      }

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message);
    }
  };

  const deletePhoto = async (photoId) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              
              const response = await fetch(`${API_BASE_URL}/api/upload/photos/${photoId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const updatedPhotos = photos.filter(photo => photo.id !== photoId);
                onPhotosUpdate(updatedPhotos);
                Alert.alert('Success', 'Photo deleted successfully!');
              } else {
                throw new Error('Failed to delete photo');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          }
        }
      ]
    );
  };

  const setAsProfilePicture = async (photoId) => {
    try {
      const updatedPhotos = photos.map(photo => ({
        ...photo,
        isProfilePicture: photo.id === photoId
      }));
      
      onPhotosUpdate(updatedPhotos);
      
      // Update on server
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/users/profile-picture`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ photoId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile picture');
      }

      Alert.alert('Success', 'Profile picture updated!');

    } catch (error) {
      console.error('Profile picture update error:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    }
  };

  const renderPhotoSlot = (photo, index) => {
    const isEmpty = !photo;
    
    return (
      <TouchableOpacity
        key={index}
        style={[styles.photoSlot, isEmpty && styles.emptySlot]}
        onPress={isEmpty ? showImagePicker : undefined}
        disabled={uploading}
      >
        {isEmpty ? (
          <View style={styles.addPhotoContent}>
            <Ionicons name="camera" size={30} color="#ccc" />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </View>
        ) : (
          <>
            <Image 
              source={{ uri: photo.thumbnail || photo.url }} 
              style={styles.photo}
              onError={(error) => console.log('Image load error:', error)}
            />
            
            {photo.isProfilePicture && (
              <View style={styles.profileBadge}>
                <Text style={styles.profileBadgeText}>Main</Text>
              </View>
            )}

            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setAsProfilePicture(photo.id)}
              >
                <Ionicons name="star" size={16} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => deletePhoto(photo.id)}
              >
                <Ionicons name="trash" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </>
        )}
        
        {uploading && isEmpty && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator color="#FF6B6B" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Photos</Text>
      <Text style={styles.subtitle}>
        Add up to {maxPhotos} photos. Your first photo will be your main profile photo.
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.photosContainer}
        contentContainerStyle={styles.photosContent}
      >
        {Array.from({ length: maxPhotos }, (_, index) => {
          const photo = photos[index];
          return renderPhotoSlot(photo, index);
        })}
      </ScrollView>

      {photos.length > 0 && (
        <Text style={styles.photoCount}>
          {photos.length} of {maxPhotos} photos added
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  photosContainer: {
    marginBottom: 15,
  },
  photosContent: {
    paddingRight: 20,
  },
  photoSlot: {
    width: 120,
    height: 120,
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  emptySlot: {
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoContent: {
    alignItems: 'center',
  },
  addPhotoText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  profileBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  profileBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  photoActions: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  deleteButton: {
    backgroundColor: 'rgba(255,0,0,0.7)',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCount: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});

export default ImageUpload;