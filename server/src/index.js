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
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) : [])
  : 'http://localhost:5173';

console.log('CORS origins:', corsOrigins);
console.log('Environment:', process.env.NODE_ENV);
console.log('Database URL exists:', !!process.env.DATABASE_URL);

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100 // より寛容な制限を開発環境で設定
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dynamics365', dynamics365Routes);
app.use('/api/crm', crmRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/crm-integration', crmIntegrationRoutes);
app.use('/api/crm-auth', crmAuthRoutes);

// Error handling middleware
app.use(errorHandler);

// Initialize Redis and start server
(async () => {
  try {
    await initRedis();
    console.log('Redis initialization complete');
  } catch (error) {
    console.error('Redis initialization failed:', error);
    console.log('Application will continue with in-memory cache');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})();