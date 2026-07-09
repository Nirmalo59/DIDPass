import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5555;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for dev environment
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'DIDPass Backend API is running smoothly!',
    timestamp: new Date().toISOString()
  });
});

// Start Server
const startServer = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();
    console.log("MongoDB Connected. Starting server...");
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on 127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

startServer();
