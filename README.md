<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=40&pause=1000&color=2563EB&center=true&vCenter=true&width=1000&height=80&lines=Decentralized+Identity;and+Passwordless+Authentication+System" alt="Typing SVG" />
</div>

<p align="center">
  <strong>DIDPass</strong> is a cutting-edge Decentralized Identity and Passwordless Authentication System. It replaces legacy, vulnerable username-and-password systems with a "Login with Google" style SSO (Single Sign-On) experience, but built natively on the Ethereum blockchain. Users securely authenticate into consumer platforms (like a Job Portal) using their MetaMask wallet. By leveraging cryptographic signatures and zero-knowledge principles, DIDPass ensures absolute data ownership and privacy. Furthermore, DIDPass acts as a secure, blockchain-anchored cryptographic registry for document verification, ensuring that degrees, certificates, and sensitive files are mathematically proven to be authentic without relying on centralized databases.
</p>

---

## 🏗 Architecture Overview

The DIDPass ecosystem is divided into three major architectural components:

### 1. DIDPass Main Portal (Identity Provider)
This is the core Identity Provider (IdP) platform. It serves a similar role to "Log in with Google," but operates on decentralized Web3 principles.
*   **Wallet Authentication:** Users connect their MetaMask wallet. 
*   **Cryptographic Signatures:** The backend generates a random cryptographic nonce. The user signs this nonce using their wallet's private key. 
*   **Authentication Validation:** The backend uses `ethers.js` to mathematically verify the signature. If the signature matches a registered address, the user is issued a secure session token.
*   **Issuer UI:** Authorized institutions can upload documents to the DIDPass dashboard. The system generates an unbreakable SHA-256 hash of the document and anchors it to the Ethereum blockchain.

### 2. Job Portal (Consumer Application)
This represents a third-party application relying on DIDPass for security and SSO authentication.
*   **Seamless SSO:** The portal uses DIDPass for user login, delegating all authentication logic.
*   **Document Verifier:** A dedicated dashboard for employers to verify applicant documents. By uploading an applicant's document, the system computes its SHA-256 hash locally and queries the blockchain. 
*   **Tamper-Proof Proof:** If the hash exists on the blockchain, the document is 100% authentic. If even a single byte of the document was altered, the hash changes, and the verification instantly fails.

### 3. Smart Contract (`DocumentRegistry.sol`)
The fundamental source of truth deployed on the Ethereum (Hardhat) network.
*   **Privacy-First:** The contract never stores actual files. It only stores `bytes32` hashes, ensuring absolute data privacy.
*   **Immutable Ledger:** Once a document hash is recorded by an authorized issuer, the timestamp and the issuer's address are permanently etched into the blockchain ledger.

---

## ⚙️ Technical Stack

*   **Frontend:** Next.js 15, React 19, Tailwind CSS, Ethers.js
*   **Backend:** Node.js, Express, MongoDB (Memory Server for rapid dev), Multer, Ethers.js
*   **Smart Contracts:** Solidity `^0.8.24`, Hardhat Blockchain Environment

---

## 🚀 How to Run the Project Locally

### 1. Start the Local Blockchain & Deploy Contract
```bash
cd didpass/contracts
npm install
# Start local Hardhat node
npx hardhat node
# In a new terminal, deploy the smart contract:
npx hardhat run scripts/deploy.cjs --network localhost
```

### 2. Start the DIDPass Backend
```bash
cd didpass/backend
npm install
npm run dev
# Runs on http://localhost:5555
```

### 3. Start the DIDPass Frontend
```bash
cd didpass/frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### 4. Start the Job Portal Frontend
```bash
cd job-portal
npm install
npm run dev -- -p 3001
# Runs on http://localhost:3001
```

---

## 🔐 Workflow & User Journey

1.  **Identity Registration:** A user navigates to DIDPass (`localhost:3000`), connects their MetaMask wallet, and registers their identity.
2.  **SSO Login:** The user navigates to the Job Portal (`localhost:3001`) and clicks "Login with DIDPass." They are redirected, prompted to sign a cryptographic nonce, and instantly authenticated back into the Job Portal.
3.  **Document Issuance:** An authorized issuer uploads a legitimate document (e.g., a university degree) to the DIDPass Dashboard. The hash is pushed to the blockchain.
4.  **Verification:** An employer uploads the document on the Job Portal Dashboard. The system computes the hash and verifies its existence on the blockchain registry, guaranteeing authenticity.
