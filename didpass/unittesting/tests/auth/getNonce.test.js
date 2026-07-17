const request = require('supertest');
const { ethers } = require('ethers');

const API_URL = 'http://127.0.0.1:5555';

describe('Authentication: getNonce()', () => {
  it('should successfully return a cryptographic nonce for a valid wallet address', async () => {
    // Generate a random wallet address for testing
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;

    const response = await request(API_URL)
      .get('/api/auth/nonce')
      .query({ address });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('nonce');
    expect(response.body.nonce).toContain('Sign this message to authenticate with DIDPass');
  });

  it('should return a 400 error if no wallet address is provided', async () => {
    const response = await request(API_URL)
      .get('/api/auth/nonce');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'Wallet address is required');
  });
});


