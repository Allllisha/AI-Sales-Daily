require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { initRedis } = require('./services/redis');

const authRoutes = require('./routes/auth');
const knowledgeRoutes = require('./routes/knowledge');
const incidentRoutes = require('./routes/incidents');
const checklistRoutes = require('./routes/checklists');
const aiRoutes = require('./routes/ai');
const speechRoutes = require('./routes/speech');
const analyticsRoutes = require('./routes/analytics');
const siteRoutes = require('./routes/sites');
const userRoutes = require('./routes/users');
const { errorHandler } = require('./middleware/errorHandler');
const { swaggerUi, specs } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || process.env.WEBSITES_PORT || 3001;

app.set('trust proxy', true);

// Build allowed CORS origins list
function getAllowedOrigins() {
  if (process.env.NODE_ENV === 'production') {
    const origins = [process.env.CLIENT_URL || 'https://knowhow-app.azurewebsites.net'];
    // Also allow the API server's own origin (for embedded client)
    const apiUrl = process.env.API_URL || 'https://knowhow-api.azurewebsites.net';
    if (!origins.includes(apiUrl)) {
      origins.push(apiUrl);
    }
    if (process.env.CORS_ORIGIN && !origins.includes(process.env.CORS_ORIGIN)) {
      origins.push(process.env.CORS_ORIGIN);
    }
    return origins;
  }
  // Development: allow all common local origins
  const devOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3010',
  ];
  // Also add CORS_ORIGIN and CLIENT_URL from env if set
  if (process.env.CORS_ORIGIN && !devOrigins.includes(process.env.CORS_ORIGIN)) {
    devOrigins.push(process.env.CORS_ORIGIN);
  }
  if (process.env.CLIENT_URL && !devOrigins.includes(process.env.CLIENT_URL)) {
    devOrigins.push(process.env.CLIENT_URL);
  }
  return devOrigins;
}

// Socket.io setup
const { createServer } = require('http');
const { Server } = require('socket.io');
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = getAllowedOrigins();
      if (allowed.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('Socket.io blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }
});

// CORS configuration - MUST be before helmet and other middleware
const corsOrigins = getAllowedOrigins();

console.log('CORS origins:', corsOrigins);
console.log('Environment:', process.env.NODE_ENV);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server, same-origin via proxy)
    if (!origin) return callback(null, true);
    if (corsOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin, '| Allowed:', corsOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
}));

// Explicitly handle preflight OPTIONS requests for all routes
app.options('*', cors());

// Security middleware (after CORS to avoid header conflicts)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "https://*.microsoft.com", "https://*.azure.com", "wss:", "ws:"],
      workerSrc: ["'self'", "blob:"],
    }
  }
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 2000 : 1000,
  message: 'リクエストが多すぎます。しばらくしてからお試しください。',
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = forwarded.split(',');
      return ips[0].trim();
    }
    return (req.ip || 'unknown').split(':')[0];
  },
  validate: {
    trustProxy: false,
    xForwardedForHeader: false
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {}
  };

  try {
    const pool = require('./db/pool');
    await pool.query('SELECT 1');
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'DEGRADED';
  }

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

  // Always return 200 so Docker/Azure health checks pass even when DB/Redis is temporarily unavailable
  res.status(200).json(health);
});

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ノウハウ共有AI API Documentation',
}));

// Serve static files from React app (for production)
const path = require('path');
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/speech', speechRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/users', userRoutes);

// Serve static files from React build (must be after API routes)
const fs = require('fs');
if (fs.existsSync(clientBuildPath)) {
  console.log('Serving static files from:', clientBuildPath);
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.warn('Client build directory not found:', clientBuildPath);
}

// Error handling middleware
app.use(errorHandler);

// Initialize services and start server
(async () => {
  try {
    console.log('Testing database connection...');
    const pool = require('./db/pool');
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('Database connection successful:', testResult.rows[0].current_time);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Database will retry connections as needed');
  }

  try {
    await initRedis();
    console.log('Redis initialization complete');
  } catch (error) {
    console.error('Redis initialization failed:', error);
    console.log('Application will continue with in-memory cache');
  }

  console.log('Environment check:');
  console.log('AZURE_SPEECH_KEY:', process.env.AZURE_SPEECH_KEY ? 'Set' : 'Not set');
  console.log('AZURE_SPEECH_REGION:', process.env.AZURE_SPEECH_REGION || 'Not set');
  console.log('AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? 'Set' : 'Not set');
  console.log('AZURE_SEARCH_ENDPOINT:', process.env.AZURE_SEARCH_ENDPOINT ? 'Set' : 'Not set');

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
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected via WebSocket`);
    realtimeHandler.handleConnection(socket);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Knowhow server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API Docs: http://localhost:${PORT}/api-docs`);
  });
})();
