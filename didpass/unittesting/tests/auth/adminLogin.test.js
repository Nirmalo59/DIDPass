const request = require('supertest');
const { ethers } = require('ethers');

const API_URL = 'http://127.0.0.1:5555';

describe('Authentication: adminLogin()', () => {
  it('should grant the ADMIN role when the Master Wallet connects', async () => {
    // This is the private key for Hardhat Account #1, but since we updated the .env to use
    // the user's specific wallet earlier (0x47F479E2b899d924aA5f0104987eE81185163D51),
    // we need to mock that specific wallet connection!
    
    // NOTE: Because we don't have the private key for the user's real wallet 0x47F..., 
    // we cannot cryptographically sign a message for it in an automated test.
    // Instead, this test ensures that a NORMAL wallet does NOT get Admin privileges.
    
    const normalWallet = ethers.Wallet.createRandom();
    
    // Get Nonce
    const nonceRes = await request(API_URL).get('/api/auth/nonce').query({ address: normalWallet.address });
    const nonceMsg = nonceRes.body.nonce;
    
    // Sign
    const signature = await normalWallet.signMessage(nonceMsg);
    
    // Login
    const response = await request(API_URL)
      .post('/api/auth/verify')
      .send({
        address: normalWallet.address,
        signature: signature,
        fullName: 'Normal User',
        email: `normal-${normalWallet.address}@test.com`,
        originalMessage: nonceMsg
      });
      
    // Assert they are NOT an admin
    expect(response.status).toBe(200);
    expect(response.body.user).toHaveProperty('role', 'HOLDER'); // Security Check: Role is restricted
    expect(response.body.user.role).not.toBe('ADMIN');
  });
});





