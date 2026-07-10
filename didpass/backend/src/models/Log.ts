import mongoose, { Schema, Document } from 'mongoose';
import { appendToPhysicalLog } from '../utils/fileLogger';

export interface ILog extends Document {
  action: string;
  details: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'INFO';
  walletAddress?: string; // Optional, to track which wallet initiated it
  ipAddress?: string; // For security tracking
  endpoint?: string; // The URL route/path (e.g. /api/auth/login)
  createdAt: Date;
}

const LogSchema: Schema = new Schema({
  action: { type: String, required: true },
  details: { type: String, required: true },
  status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING', 'INFO'], required: true },
  walletAddress: { type: String },
  ipAddress: { type: String },
  endpoint: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Middleware: Automatically write to the physical append-only file after saving to DB
LogSchema.post('save', function (doc) {
  // Convert Mongoose document to plain JSON object
  const plainDoc = doc.toObject();
  
  // Remove Mongoose specific fields for cleaner logs
  delete plainDoc.__v;
  
  // Send it to the physical file logger
  appendToPhysicalLog(plainDoc);
});

export default mongoose.model<ILog>('Log', LogSchema);
