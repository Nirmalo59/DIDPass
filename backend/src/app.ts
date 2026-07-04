import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import authRoutes from './routes/auth';
import issuerRoutes from './routes/issuers';
import credentialRoutes from './routes/credentials';
import didRoutes from './routes/did';
import documentRoutes from './routes/documents';
import auditRoutes from './routes/audit';
import demoRoutes from './routes/demo';
import logger from './utils/audit';

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // allow file downloads directly
}));

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_DIDPASS_URL || 'http://localhost:3000',
  process.env.FRONTEND_UNIVERSITY_URL || 'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

// General configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging (Morgan)
const morganFormat = process.env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(morgan(morganFormat, {
  stream: { write: (message) => logger.http(message.trim()) }
}));

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/issuers', issuerRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/did', didRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/demo', demoRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'DIDPass API Gateway',
    version: '1.0.0',
    network: 'Hardhat Local (ChainID: 31337)',
    status: 'online',
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled Error: ${err.message}`);
  return res.status(500).json({
    success: false,
    message: err.message || 'Internal server error occurred',
  });
});

// Start Server
app.listen(PORT, () => {
  logger.info(`═`.repeat(50));
  logger.info(`🚀 DIDPass Backend running on port ${PORT}`);
  logger.info(`🔗 API Gateway: http://localhost:${PORT}`);
  logger.info(`⚙️  Allowed Origins: ${allowedOrigins.join(', ')}`);
  logger.info(`═`.repeat(50));
});

export default app;
