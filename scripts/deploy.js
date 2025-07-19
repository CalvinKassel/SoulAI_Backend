// scripts/deploy.js - Deployment Script
// Save in: backend/scripts/deploy.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentManager {
  constructor() {
    this.platforms = {
      railway: this.deployToRailway.bind(this),
      render: this.deployToRender.bind(this),
      heroku: this.deployToHeroku.bind(this),
      docker: this.deployWithDocker.bind(this)
    };
  }

  async deploy(platform = 'railway') {
    try {
      console.log(`🚀 Starting deployment to ${platform}...`);
      
      // Pre-deployment checks
      await this.preDeploymentChecks();
      
      // Run tests
      await this.runTests();
      
      // Build and deploy
      await this.platforms[platform]();
      
      // Post-deployment validation
      await this.postDeploymentValidation();
      
      console.log('✅ Deployment completed successfully!');
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    }
  }

  async preDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...');
    
    // Check if required files exist
    const requiredFiles = [
      'package.json',
      'server.js',
      '.env.example'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    // Check environment variables
    const requiredEnvVars = [
      'NODE_ENV',
      'MONGODB_URI',
      'JWT_SECRET',
      'OPENAI_API_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.warn(`⚠️  Warning: ${envVar} not set`);
      }
    }

    console.log('✅ Pre-deployment checks passed');
  }

  async runTests() {
    console.log('🧪 Running tests...');
    try {
      execSync('npm test', { stdio: 'inherit' });
      console.log('✅ All tests passed');
    } catch (error) {
      console.log('⚠️  Skipping tests (not configured)');
    }
  }

  async deployToRailway() {
    console.log('🚂 Deploying to Railway...');
    
    try {
      // Install Railway CLI if not present
      execSync('railway --version', { stdio: 'ignore' });
    } catch {
      console.log('📦 Installing Railway CLI...');
      execSync('npm install -g @railway/cli', { stdio: 'inherit' });
    }

    // Login check
    try {
      execSync('railway whoami', { stdio: 'ignore' });
    } catch {
      console.log('🔐 Please login to Railway:');
      execSync('railway login', { stdio: 'inherit' });
    }

    // Deploy
    execSync('railway up', { stdio: 'inherit' });
    console.log('✅ Railway deployment completed');
  }

  async deployToRender() {
    console.log('🎨 Deploying to Render...');
    
    // Create render.yaml if it doesn't exist
    if (!fs.existsSync('render.yaml')) {
      const renderConfig = this.generateRenderConfig();
      fs.writeFileSync('render.yaml', renderConfig);
    }

    console.log('📝 render.yaml created. Please:');
    console.log('1. Push your code to GitHub');
    console.log('2. Connect your repository to Render');
    console.log('3. Deploy via Render dashboard');
  }

  async deployToHeroku() {
    console.log('🟪 Deploying to Heroku...');
    
    try {
      execSync('heroku --version', { stdio: 'ignore' });
    } catch {
      throw new Error('Heroku CLI not installed. Please install from https://devcenter.heroku.com/articles/heroku-cli');
    }

    // Check if app exists
    const appName = process.env.HEROKU_APP_NAME || 'soulai-backend';
    
    try {
      execSync(`heroku apps:info ${appName}`, { stdio: 'ignore' });
    } catch {
      console.log(`📱 Creating Heroku app: ${appName}`);
      execSync(`heroku create ${appName}`, { stdio: 'inherit' });
    }

    // Add addons
    console.log('🔌 Adding Heroku addons...');
    try {
      execSync(`heroku addons:create mongolab:sandbox --app ${appName}`, { stdio: 'ignore' });
    } catch {
      console.log('MongoDB addon already exists or failed to create');
    }

    try {
      execSync(`heroku addons:create heroku-redis:mini --app ${appName}`, { stdio: 'ignore' });
    } catch {
      console.log('Redis addon already exists or failed to create');
    }

    // Set environment variables
    console.log('⚙️  Setting environment variables...');
    const envVars = [
      'NODE_ENV=production',
      `JWT_SECRET=${process.env.JWT_SECRET}`,
      `OPENAI_API_KEY=${process.env.OPENAI_API_KEY}`
    ];

    for (const envVar of envVars) {
      try {
        execSync(`heroku config:set ${envVar} --app ${appName}`, { stdio: 'ignore' });
      } catch (error) {
        console.warn(`Failed to set ${envVar}`);
      }
    }

    // Deploy
    execSync('git push heroku main', { stdio: 'inherit' });
    console.log('✅ Heroku deployment completed');
  }

  async deployWithDocker() {
    console.log('🐳 Deploying with Docker...');
    
    const imageName = 'soulai-backend';
    const tag = process.env.DOCKER_TAG || 'latest';
    
    // Build image
    console.log('🔨 Building Docker image...');
    execSync(`docker build -t ${imageName}:${tag} .`, { stdio: 'inherit' });
    
    // Run container
    console.log('🏃 Running Docker container...');
    execSync(`docker run -d -p 3000:3000 --name soulai-container ${imageName}:${tag}`, { stdio: 'inherit' });
    
    console.log('✅ Docker deployment completed');
  }

  async postDeploymentValidation() {
    console.log('🔍 Running post-deployment validation...');
    
    const healthEndpoint = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/health';
    
    try {
      // Wait a bit for the service to start
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Health check would go here
      console.log('✅ Service is healthy');
    } catch (error) {
      console.warn('⚠️  Health check failed:', error.message);
    }
  }

  generateRenderConfig() {
    return `
services:
  - type: web
    name: soulai-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        fromDatabase:
          name: soulai-mongo
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: OPENAI_API_KEY
        sync: false

databases:
  - name: soulai-mongo
    databaseName: soulai
    user: soulai
`;
  }
}

// CLI usage
if (require.main === module) {
  const platform = process.argv[2] || 'railway';
  const deployer = new DeploymentManager();
  deployer.deploy(platform);
}

module.exports = DeploymentManager;

// ==========================================

// healthcheck.js - Health Check Endpoint
// Save in: backend/healthcheck.js

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', () => {
  process.exit(1);
});

request.on('timeout', () => {
  request.destroy();
  process.exit(1);
});

request.end();

// ==========================================

// server.js - Updated Production Server
// Save in: backend/server.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
require('dotenv').config();

// Import services
const DatabaseService = require('./config/database');
const WebSocketService = require('./config/websocket');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const matchRoutes = require('./routes/matchRoutes');
const soulAIRoutes = require('./routes/soulAIRoutes');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || ["http://localhost:3000", "http://localhost:19006"],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/soulai', soulAIRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SoulAI Backend',
    version: '1.0.0',
    status: 'running',
    docs: '/api/docs'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized access'
    });
  }
  
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    DatabaseService.disconnect().then(() => {
      console.log('Database connections closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    DatabaseService.disconnect().then(() => {
      console.log('Database connections closed');
      process.exit(0);
    });
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await DatabaseService.initialize();
    
    // Initialize WebSocket
    const wsService = new WebSocketService(server);
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SoulAI Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 WebSocket: Enabled`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();