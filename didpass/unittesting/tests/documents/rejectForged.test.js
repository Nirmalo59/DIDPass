const request = require('supertest');

const API_URL = 'http://127.0.0.1:5555';

describe('Documents: rejectForged()', () => {
  it('should securely reject access to a document without a valid JWT token', async () => {
    // Attempting to access an encrypted document via direct API route without 
    // the time-locked Magic Link (JWT) should instantly fail.
    
    const response = await request(API_URL)
      .get(`/api/documents/download`)
      // No token provided!
      
    expect(response.status).toBe(400);
    expect(response.text).toContain('Magic Link token is missing');
  });
});


