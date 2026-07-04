import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token into requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('didpass_jwt');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const getChallenge = async (walletAddress: string) => {
  const res = await api.post('/auth/challenge', { walletAddress });
  return res.data;
};

export const verifySignature = async (body: {
  walletAddress: string;
  signature: string;
  nonce: string;
  credentialType?: string;
  clientId?: string;
  redirectUri?: string;
}) => {
  const res = await api.post('/auth/verify', body);
  return res.data;
};

export const verifyToken = async () => {
  const res = await api.get('/auth/verify-token');
  return res.data;
};

// Issuer endpoints
export const registerIssuer = async (body: {
  walletAddress: string;
  name: string;
  type: string;
  logoEmoji?: string;
  email?: string;
  website?: string;
}) => {
  const res = await api.post('/issuers/register', body);
  return res.data;
};

export const getIssuers = async () => {
  const res = await api.get('/issuers');
  return res.data;
};

// Credential endpoints
export const issueCredential = async (body: {
  holderAddress: string;
  holderName: string;
  holderEmail?: string;
  credentialType: string;
  metadata?: object;
  expiresAt?: string;
  documentHash?: string;
  encryptedFilePath?: string;
  ipfsCid?: string;
}) => {
  const res = await api.post('/credentials/issue', body);
  return res.data;
};

export const getWalletCredentials = async (address: string) => {
  const res = await api.get(`/credentials/wallet/${address}`);
  return res.data;
};

export const getPendingCredentials = async (address: string) => {
  const res = await api.get(`/credentials/pending/${address}`);
  return res.data;
};

export const claimCredential = async (credentialHash: string) => {
  const res = await api.post('/credentials/claim', { credentialHash });
  return res.data;
};

export const revokeCredential = async (credentialHash: string, reason: string) => {
  const res = await api.post('/credentials/revoke', { credentialHash, reason });
  return res.data;
};

// DID Document endpoints
export const registerDID = async (body: {
  walletAddress: string;
  didUri: string;
  documentHash: string;
  publicKey: string;
  txHash?: string;
}) => {
  const res = await api.post('/did/register', body);
  return res.data;
};

export const getDID = async (address: string) => {
  const res = await api.get(`/did/${address}`);
  return res.data;
};

// Document proof endpoints
export const uploadDocument = async (formData: FormData) => {
  const res = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const verifyDocument = async (hash: string) => {
  const res = await api.get(`/documents/${hash}/verify`);
  return res.data;
};

// Audit logs
export const getAuditLogs = async () => {
  const res = await api.get('/audit/logs');
  return res.data;
};

// Demo endpoints — issue a real on-chain credential to any wallet instantly
export const issueDemoCredential = async (body: {
  walletAddress: string;
  holderName?: string;
  holderEmail?: string;
}) => {
  const res = await api.post('/demo/issue-me', body);
  return res.data;
};

export const getDemoStatus = async (address: string) => {
  const res = await api.get(`/demo/status/${address}`);
  return res.data;
};

export default api;
export { api };
