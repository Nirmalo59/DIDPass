import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  walletAddress: string;
  nonce: string;
  role: 'HOLDER' | 'ISSUER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  organizationName?: string;
  publicKey?: string;
  did?: string;
}

const UserSchema: Schema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true, unique: true },
  nonce: { type: String, required: true, default: () => Math.floor(Math.random() * 1000000).toString() },
  role: { type: String, enum: ['HOLDER', 'ISSUER', 'ADMIN'], default: 'HOLDER' },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  organizationName: { type: String },
  publicKey: { type: String }, // For cryptographic signatures later
  did: { type: String } // Decentralized Identifier
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
