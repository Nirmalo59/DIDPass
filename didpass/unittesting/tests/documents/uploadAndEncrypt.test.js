const request = require('supertest');
const { ethers } = require('ethers');

const API_URL = 'http://127.0.0.1:5555';

describe('Documents: uploadAndEncrypt()', () => {
  let token;

  beforeAll(async () => {
    // We need to login as an ISSUER to upload documents
    const wallet = ethers.Wallet.createRandom();
    const nonceRes = await request(API_URL).get('/api/auth/nonce').query({ address: wallet.address });
    const signature = await wallet.signMessage(nonceRes.body.nonce);
    
    const authRes = await request(API_URL).post('/api/auth/verify').send({
      address: wallet.address,
      signature: signature,
      fullName: 'Test Issuer',
      email: `issuer-${wallet.address}@test.com`,
      isIssuer: true, // Register as an issuer
      organizationName: 'Testing University',
      originalMessage: nonceRes.body.nonce
    });
    
    token = authRes.body.token;
  });

  it('should successfully upload, encrypt, and store a document', async () => {
    const response = await request(API_URL)
      .post('/api/documents/issue')
      .set('Authorization', `Bearer ${token}`)
      .attach('document', Buffer.from('Fake Document Content'), 'test-doc.pdf');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Document issued successfully!');
    
    // Ensure the hash is generated and returned for blockchain anchoring
    expect(response.body).toHaveProperty('documentHash');
    expect(response.body).toHaveProperty('magicLink');
  });

  it('should reject document upload if the user is not an Issuer', async () => {
    // Create a normal HOLDER token
    const holderWallet = ethers.Wallet.createRandom();
    const nonceRes = await request(API_URL).get('/api/auth/nonce').query({ address: holderWallet.address });
    const signature = await holderWallet.signMessage(nonceRes.body.nonce);
    
    const authRes = await request(API_URL).post('/api/auth/verify').send({
      address: holderWallet.address,
      signature: signature,
      fullName: 'Test Holder',
      email: `holder-${holderWallet.address}@test.com`,
      isIssuer: false, // Normal user
      originalMessage: nonceRes.body.nonce
    });
    
    const holderToken = authRes.body.token;

    const response = await request(API_URL)
      .post('/api/documents/issue')
      .set('Authorization', `Bearer ${holderToken}`)
      .attach('document', Buffer.from('Fake Document'), 'fake.pdf');

    // Should return 403 Forbidden because they are not an ISSUER
    expect(response.status).toBe(403);
  });
});
