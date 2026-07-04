import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { IssuerPortal } from './pages/IssuerPortal';
import { HolderPortal } from './pages/HolderPortal';
import { VerifierPortal } from './pages/VerifierPortal';
import { AdminPortal } from './pages/AdminPortal';
import { AuthPage } from './pages/AuthPage';
import { connectWallet } from './utils/metamask';
import * as api from './utils/api';

const App: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [role, setRole] = useState('holder'); // default role is holder

  // Check localStorage on load
  useEffect(() => {
    const token = localStorage.getItem('didpass_jwt');
    if (token) {
      api.verifyToken()
        .then((res) => {
          if (res.success) {
            setWalletAddress(res.user.walletAddress);
            setRole(res.user.role);
          } else {
            localStorage.removeItem('didpass_jwt');
          }
        })
        .catch(() => {
          localStorage.removeItem('didpass_jwt');
        });
    }
  }, []);

  const connectWalletHandler = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      
      // Perform challenge authentication to get JWT and set role
      const challengeRes = await api.getChallenge(address);
      if (challengeRes.success) {
        // Automatically request verification to set role on mount/connect
        // We will mock verify without redirect params to log in locally
        // For local login, we sign the challenge EIP-712
        const { domain, types, value } = challengeRes.challenge;
        
        // Eethers sign
        const { ethers } = require('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const { EIP712Domain, ...signingTypes } = types;
        const signature = await signer.signTypedData(domain, signingTypes, value);

        const verifyRes = await api.verifySignature({
          walletAddress: address,
          signature,
          nonce: value.nonce,
        });

        if (verifyRes.success) {
          setRole(verifyRes.role);
          localStorage.setItem('didpass_jwt', verifyRes.token);
        }
      }
    } catch (error: any) {
      console.error('Wallet connection failed:', error.message);
      // Fallback: set wallet address anyway
      try {
        const address = await connectWallet();
        setWalletAddress(address);
      } catch (err) {}
    }
  };

  const disconnectWalletHandler = () => {
    setWalletAddress('');
    setRole('holder');
    localStorage.removeItem('didpass_jwt');
  };

  return (
    <Router>
      <Navbar
        walletAddress={walletAddress}
        role={role}
        connectWalletHandler={connectWalletHandler}
        disconnectWalletHandler={disconnectWalletHandler}
      />
      <main className="container" style={{ minHeight: '80vh' }}>
        <Routes>
          <Route path="/" element={
            <Landing
              walletAddress={walletAddress}
              role={role}
              connectWalletHandler={connectWalletHandler}
            />
          } />
          
          <Route path="/issuer" element={
            role === 'issuer' || role === 'admin' ? (
              <IssuerPortal walletAddress={walletAddress} />
            ) : (
              <Navigate to="/" replace />
            )
          } />
          
          <Route path="/holder" element={
            <HolderPortal
              walletAddress={walletAddress}
              connectWalletHandler={connectWalletHandler}
            />
          } />
          
          <Route path="/verifier" element={<VerifierPortal />} />
          
          <Route path="/admin" element={
            role === 'admin' ? (
              <AdminPortal />
            ) : (
              <Navigate to="/" replace />
            )
          } />
          
          <Route path="/auth" element={
            <AuthPage
              walletAddress={walletAddress}
              setWalletAddress={setWalletAddress}
              setRole={setRole}
            />
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      <footer style={{
        textAlign: 'center',
        padding: '2rem 1.5rem',
        marginTop: '4rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
      }}>
        © 2026 DIDPass decentralized SSO wallet. Engineered for Nepal academic and financial trust infrastructure.
      </footer>
    </Router>
  );
};

export default App;
