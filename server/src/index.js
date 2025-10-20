require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { initRedis } = require('./services/redis');

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');
const dynamics365Routes = require('./routes/dynamics365');
const crmRoutes = require('./routes/crm');
const oauthRoutes = require('./routes/oauth');
const uploadRoutes = require('./routes/upload');
const crmIntegrationRoutes = require('./routes/crmIntegration');
const crmAuthRoutes = require('./routes/crmAuth');
const realtimeRoutes = require('./routes/realtime');
const { errorHandler } = require('./middleware/errorHandler');
const signalrService = require('./config/signalr');
const { swaggerUi, specs } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3001;

// Socket.io setup
const { createServer } = require('http');
const { Server } = require('socket.io');
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Same CORS policy as Express
      if (!origin) return callback(null, true);
      const corsOrigins = process.env.NODE_ENV === 'production' 
        ? ['https://salesdaily-web.azurewebsites.net']
        : ['http://localhost:5173', 'http://localhost:3000'];
      
      if (corsOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }
});

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://salesdaily-web.azurewebsites.net']
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('CORS origins:', corsOrigins);
console.log('Environment:', process.env.NODE_ENV);
console.log('Database URL exists:', !!process.env.DATABASE_URL);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or postman)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));

// Rate limiting - 本番環境でも緩やかな制限
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 2000 : 1000, // 本番環境でも1000リクエスト/15分
  message: 'リクエストが多すぎます。しばらくしてからお試しください。'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {}
  };

  // Check database connection
  try {
    const pool = require('./db/pool');
    await pool.query('SELECT 1');
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'DEGRADED';
  }

  // Check Redis connection
  try {
    const { getRedisClient } = require('./services/redis');
    const redis = getRedisClient();
    if (redis && redis.status === 'ready') {
      health.services.redis = 'connected';
    } else {
      health.services.redis = 'disconnected';
      health.status = 'DEGRADED';
    }
  } catch (error) {
    health.services.redis = 'disconnected';
    health.status = 'DEGRADED';
  }

  // Check SignalR
  health.services.signalr = signalrService.serviceClient ? 'connected' : 'not configured';

  res.status(health.status === 'OK' ? 200 : 503).json(health);
});

// Simple health check for Azure load balancer
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'にっぽ係長 API Documentation',
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scripts', require('./routes/scripts'));
app.use('/api/hearing-settings', require('./routes/hearingSettings'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dynamics365', dynamics365Routes);
app.use('/api/crm', crmRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/crm-integration', crmIntegrationRoutes);
app.use('/api/crm-auth', crmAuthRoutes);
app.use('/api/realtime', realtimeRoutes);

// Error handling middleware
app.use(errorHandler);

// Initialize services and start server
(async () => {
  // Test database connection on startup
  try {
    console.log('Testing database connection...');
    const pool = require('./db/pool');
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('Database connection successful:', testResult.rows[0].current_time);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Database will retry connections as needed');
  }

  // Initialize Redis
  try {
    await initRedis();
    console.log('Redis initialization complete');
  } catch (error) {
    console.error('Redis initialization failed:', error);
    console.log('Application will continue with in-memory cache');
  }

  // Initialize Azure SignalR if configured
  const signalrEnabled = signalrService.initialize(process.env.AZURE_SIGNALR_CONNECTION_STRING);
  if (signalrEnabled) {
    console.log('Azure SignalR Service enabled for real-time API');
  }

  // Debug environment variables
  console.log('Environment check:');
  console.log('AZURE_SPEECH_KEY:', process.env.AZURE_SPEECH_KEY ? 'Set (length: ' + process.env.AZURE_SPEECH_KEY.length + ')' : 'Not set');
  console.log('AZURE_SPEECH_REGION:', process.env.AZURE_SPEECH_REGION || 'Not set');
  console.log('AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? 'Set' : 'Not set');

  // Initialize WebSocket handler
  const RealtimeVoiceHandler = require('./websocket/realtimeHandler');
  const realtimeHandler = new RealtimeVoiceHandler(io);
  
  // Socket.io authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      console.error('Socket.io auth error:', error);
      return next(new Error('Authentication error: Invalid token'));
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected via WebSocket`);
    realtimeHandler.handleConnection(socket);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database URL: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
    console.log(`Redis URL: ${process.env.REDIS_URL ? 'Configured' : 'Not configured'}`);
    if (signalrEnabled) {
      console.log('Real-time API available at /api/realtime');
    }
  });
})();