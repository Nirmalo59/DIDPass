import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const connectDB = async () => {
  try {
    // For development, we use MongoMemoryServer to avoid requiring a local MongoDB installation.
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
    console.log(`In-Memory MongoDB Connected at ${mongoUri}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};
