const request = require('supertest');
const { ethers } = require('ethers');

const API_URL = 'http://127.0.0.1:5555';

describe('Authentication: verifySignature()', () => {
  let wallet;
  let nonceMsg;
  let tempNonce;

  beforeAll(async () => {
    wallet = ethers.Wallet.createRandom();
    
    // Step 1: Get the nonce first
    const nonceRes = await request(API_URL)
      .get('/api/auth/nonce')
      .query({ address: wallet.address });
      
    nonceMsg = nonceRes.body.nonce;
    tempNonce = nonceRes.body.tempNonce;
  });

  it('should successfully verify a valid cryptographic signature and return a JWT token', async () => {
    // Step 2: Cryptographically sign the exact message using the private key
    const signature = await wallet.signMessage(nonceMsg);

    // Step 3: Send the signature back to the server
    const response = await request(API_URL)
      .post('/api/auth/verify')
      .send({
        address: wallet.address,
        signature: signature,
        fullName: 'Test User',
        email: `test-${wallet.address}@example.com`,
        originalMessage: nonceMsg
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('role', 'HOLDER');
    expect(response.body.user).toHaveProperty('walletAddress', wallet.address.toLowerCase());
  });

  it('should reject authentication if a fake or tampered signature is provided', async () => {
    // Create a different wallet to act as an attacker
    const attackerWallet = ethers.Wallet.createRandom();
    
    // Attacker signs the message with THEIR private key instead of the correct one
    const fakeSignature = await attackerWallet.signMessage(nonceMsg);

    const response = await request(API_URL)
      .post('/api/auth/verify')
      .send({
        address: wallet.address, // Trying to login as the original wallet
        signature: fakeSignature,
        originalMessage: nonceMsg
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message', 'Signature verification failed. Wallet address mismatch.');
  });
});


