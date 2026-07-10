import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Log from '../models/Log';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-coursework-only';

// 1. Get Nonce Challenge for a Wallet Address
router.get('/nonce', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    const normalizedAddress = address.toLowerCase();
    
    // Find user by wallet address
    let user = await User.findOne({ walletAddress: normalizedAddress });
    
    // If user doesn't exist, this is a registration attempt. We'll return a generic nonce anyway.
    // Real implementation might separate registration/login, but for passwordless they merge!
    if (!user) {
      // Return a temporary nonce for the frontend to sign. Registration happens in /verify.
      const tempNonce = Math.floor(Math.random() * 1000000).toString();
      return res.json({ nonce: `Sign this message to authenticate with DIDPass: ${tempNonce}`, tempNonce });
    }

    // Refresh the user's nonce in the database
    user.nonce = Math.floor(Math.random() * 1000000).toString();
    await user.save();

    res.json({ nonce: `Sign this message to authenticate with DIDPass: ${user.nonce}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error generating nonce', error });
  }
});

// 2. Verify Signature and Login/Register
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { address, signature, fullName, email } = req.body;
    
    if (!address || !signature) {
      return res.status(400).json({ message: 'Address and signature are required' });
    }

    const normalizedAddress = address.toLowerCase();
    let user = await User.findOne({ walletAddress: normalizedAddress });

    // Determine the expected message
    let expectedNonceMsg = "";
    if (user) {
      expectedNonceMsg = `Sign this message to authenticate with DIDPass: ${user.nonce}`;
    } else {
      // For new registrations, frontend must pass the original message they signed
      const tempMsg = req.body.originalMessage;
      if (!tempMsg) return res.status(400).json({ message: 'originalMessage required for new registration' });
      expectedNonceMsg = tempMsg;
    }

    // Recover the address from the signature using ethers
    const recoveredAddress = ethers.verifyMessage(expectedNonceMsg, signature);

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      await Log.create({
        endpoint: req.originalUrl,
        action: 'AUTH_FAILED',
        details: 'Signature verification failed. Wallet address mismatch.',
        status: 'FAILED',
        walletAddress: normalizedAddress,
        ipAddress: req.ip
      });
      return res.status(401).json({ message: 'Signature verification failed. Wallet address mismatch.' });
    }

    // If verification passes and user doesn't exist, register them
    if (!user) {
      if (!fullName || !email) {
        return res.status(400).json({ message: 'fullName and email required for new accounts' });
      }
      user = new User({
        fullName,
        email,
        walletAddress: normalizedAddress,
        role: req.body.isIssuer ? 'ISSUER' : 'HOLDER'
      });
      await user.save();
      
      await Log.create({
        endpoint: req.originalUrl,
        action: 'USER_REGISTERED',
        details: `New user registered with role: ${user.role}`,
        status: 'SUCCESS',
        walletAddress: normalizedAddress,
        ipAddress: req.ip
      });
    } else {
      // Update nonce to prevent replay attacks
      user.nonce = Math.floor(Math.random() * 1000000).toString();
      await user.save();
      
      await Log.create({
        endpoint: req.originalUrl,
        action: 'WALLET_CONNECTED',
        details: `User logged in successfully via cryptographic signature`,
        status: 'SUCCESS',
        walletAddress: normalizedAddress,
        ipAddress: req.ip
      });
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role, walletAddress: user.walletAddress },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, walletAddress: user.walletAddress } });
  } catch (error: any) {
    await Log.create({
      endpoint: req.originalUrl,
      action: 'AUTH_ERROR',
      details: error.message || 'Server error during verification',
      status: 'FAILED',
      ipAddress: req.ip
    });
    res.status(500).json({ message: 'Server error during verification', error });
  }
});

export default router;
