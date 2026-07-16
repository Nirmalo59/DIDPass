# DIDPass: Decentralized Identity & Verification Portal

DIDPass is a cutting-edge, Web3-based decentralized identity system designed to replace traditional username/password authentication. It allows users to authenticate using cryptographic signatures via MetaMask, enables authorized institutions to anchor verifiable credentials to the Ethereum blockchain, and provides a zero-knowledge approach to third-party verification.

## Features

- **Passwordless Authentication**: Users log in by signing a cryptographic nonce (ECDSA) with their Web3 wallet, eliminating password breaches.
- **Role-Based Access Control**:
  - **Holders**: Normal users who can view their profile and login history.
  - **Issuers**: Authorized organizations (e.g., Universities) who can issue credentials.
  - **Admin**: A Master Wallet account that governs the entire ecosystem (Suspend, Activate, Delete users).
- **Blockchain Anchoring (Immutable Proof)**: Credentials are mathematically hashed using SHA-256 and anchored to an Ethereum Smart Contract (DocumentRegistry).
- **Hybrid Storage & Encryption**: Physical documents are encrypted symmetrically via AES-256-GCM and stored securely off-chain (simulated IPFS/Local Storage).
- **Time-Locked Magic Links**: Issuers generate secure, 10-minute expiring JSON Web Tokens (JWT) for sharing sensitive credentials safely.
- **Third-Party Verification (Job Portal)**: External entities can cryptographically verify if a document hash exists on the blockchain without accessing private data, preventing forgeries instantly.

---

## Technical Stack

- **Frontend**: Next.js (React), Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, Mongoose (MongoDB)
- **Blockchain**: Hardhat, Ethers.js, Solidity Smart Contracts
- **Cryptography**: AES-256-GCM (Encryption), SHA-256 (Hashing), ECDSA (Signatures)

---

## How to Run the Ecosystem

The DIDPass ecosystem consists of four main components. You must start them in four separate terminal windows.

### Prerequisites
- Node.js (v18+)
- MongoDB Database (Running locally on `127.0.0.1:27017`)
- MetaMask Browser Extension

### 1. Start the Blockchain Node
Navigate to the `contracts` folder and start the local Ethereum network:
```bash
cd contracts
npm install
npx hardhat node
```
*(Leave this terminal running. It will provide you with 20 test accounts. Account #0 is your Master Admin wallet).*

### 2. Start the Backend API
Open a second terminal, navigate to the `backend` folder:
```bash
cd backend
npm install
npm run dev
```
*(Runs on `http://localhost:5555`. Ensure your MongoDB is active before starting).*

### 3. Start the Main DIDPass Dashboard
Open a third terminal, navigate to the `frontend` folder:
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:3000`).*

### 4. Start the Third-Party Job Portal
Open a fourth terminal, navigate to the `job-portal` folder:
```bash
cd job-portal
npm install
npm run dev
```
*(Runs on `http://localhost:3003`).*

---

## Admin Configuration

The system recognizes a Master Admin based on a hardcoded wallet address in the backend environment variables.
To log in as the Master Admin:
1. Open MetaMask and connect to the **Hardhat Localhost** network (`http://127.0.0.1:8545`, Chain ID `31337`).
2. Import the private key of Hardhat Account #0 (`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).
3. Navigate to `http://localhost:3000/login?isadmin=true`
4. Connect the imported wallet. You will instantly be granted access to the **Admin Dashboard** to manage users.

---
*Developed for Advanced Cryptography & Security Coursework.*
