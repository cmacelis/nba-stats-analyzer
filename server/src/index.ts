import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import nbaRouter from './routes/nba';
import nbaNewsRouter from './routes/nba_news';
import userRouter from './routes/user';

// Error handling middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { adapterMiddleware } from './middleware/adapterMiddleware';

// Adapters
import { bootstrapAdapters, League } from './adapters';
import { adapterConfig, logAdapterConfig } from './config/adapters.config';

const app = express();
const port = process.env.PORT || 3001;

// ============================================================================
// Bootstrap Phase 0: Initialize adapters
// ============================================================================
console.log('[Server] Starting Phase 0 initialization...');
bootstrapAdapters();
logAdapterConfig();
if (!adapterConfig.enabled) {
  console.warn('[Server] ADAPTERS_ENABLED=false: Using legacy direct NBA calls');
}

// Configure CORS with more specific options
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================================================
// API Routes (Legacy + League-aware)
// ============================================================================

// Legacy routes (default to NBA for backwards compatibility)
app.use('/api/nba', adapterMiddleware(League.NBA), nbaRouter);
app.use('/api/nba', adapterMiddleware(League.NBA), nbaNewsRouter);

// League-aware routes (new Phase 1+ paths)
// /api/:league/players, /api/:league/edge, etc.
if (adapterConfig.features.leagueAwareRoutes) {
  app.use('/api/:league/nba', adapterMiddleware(), nbaRouter);
  app.use('/api/:league/nba', adapterMiddleware(), nbaNewsRouter);
  console.log('[Server] League-aware routes enabled');
}

// User routes (league-agnostic)
app.use('/api/user', userRouter);

// Error handling
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
}); 