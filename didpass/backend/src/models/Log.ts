import mongoose, { Schema, Document } from 'mongoose';

export interface ILog extends Document {
  action: string;
  details: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'INFO';
  walletAddress?: string; // Optional, to track which wallet initiated the action
  transactionHash?: string; // Optional, for blockchain events
  ipAddress?: string; // Optional
}

const LogSchema: Schema = new Schema({
  action: { type: String, required: true },
  details: { type: String, required: true },
  status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING', 'INFO'], required: true },
  walletAddress: { type: String },
  transactionHash: { type: String },
  ipAddress: { type: String }
}, { timestamps: true });

export default mongoose.model<ILog>('Log', LogSchema);
