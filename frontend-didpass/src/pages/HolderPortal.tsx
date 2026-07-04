import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CredentialCard, CredentialType } from '../components/CredentialCard';
import * as api from '../utils/api';
import { signEIP712 } from '../utils/metamask';
import { ethers } from 'ethers';

interface HolderPortalProps {
  walletAddress: string;
  connectWalletHandler: () => Promise<void>;
}

export const HolderPortal: React.FC<HolderPortalProps> = ({
  walletAddress,
  connectWalletHandler,
}) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'creds' | 'pending' | 'did'>('creds');
  
  const [credentials, setCredentials] = useState<CredentialType[]>([]);
  const [pendingCredentials, setPendingCredentials] = useState<CredentialType[]>([]);
  const [loading, setLoading] = useState(false);

  // Demo credential states
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [issuingDemo, setIssuingDemo] = useState(false);
  const [demoResult, setDemoResult] = useState<{ success: boolean; message: string; txHash?: string; studentId?: string } | null>(null);
  const [hasActiveCredential, setHasActiveCredential] = useState<boolean | null>(null); // null = checking

  // DID document states
  const [didDoc, setDidDoc] = useState<any>(null);
  const [loadingDid, setLoadingDid] = useState(false);
  const [registeringDid, setRegisteringDid] = useState(false);

  // Modal QR state
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedCredHash, setSelectedCredHash] = useState('');

  useEffect(() => {
    // Check if there is an incoming claim link from email e.g. ?claim=hash
    const claimHash = searchParams.get('claim');
    if (claimHash) {
      setActiveTab('pending');
    }
  }, [searchParams]);

  useEffect(() => {
    if (walletAddress) {
      fetchCredentials();
      fetchDidDoc();
      checkDemoStatus();
    }
  }, [walletAddress]);

  const checkDemoStatus = async () => {
    try {
      const res = await api.getDemoStatus(walletAddress);
      setHasActiveCredential(res.hasCredential);
    } catch {
      setHasActiveCredential(false);
    }
  };

  const handleIssueDemoCredential = async () => {
    if (!demoName.trim()) {
      alert('Please enter your full name first.');
      return;
    }
    setIssuingDemo(true);
    setDemoResult(null);
    try {
      const res = await api.issueDemoCredential({
        walletAddress,
        holderName: demoName.trim(),
        holderEmail: demoEmail.trim() || undefined,
      });
      setDemoResult({ success: res.success, message: res.message, txHash: res.txHash, studentId: res.studentId });
      if (res.success) {
        setHasActiveCredential(true);
        fetchCredentials(); // refresh credential list
      }
    } catch (err: any) {
      setDemoResult({ success: false, message: err.response?.data?.message || err.message || 'Issuance failed' });
    } finally {
      setIssuingDemo(false);
    }
  };

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const res = await api.getWalletCredentials(walletAddress);
      if (res.success) {
        // Active, Revoked, Expired credentials
        const claimed = res.credentials.filter((c: any) => c.status !== 'PENDING');
        const pending = res.credentials.filter((c: any) => c.status === 'PENDING');
        setCredentials(claimed);
        setPendingCredentials(pending);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDidDoc = async () => {
    setLoadingDid(true);
    try {
      const res = await api.getDID(walletAddress);
      if (res.success) {
        setDidDoc(res.didDocument);
      } else {
        setDidDoc(null);
      }
    } catch (err) {
      setDidDoc(null);
    } finally {
      setLoadingDid(false);
    }
  };

  const handleClaim = async (hash: string) => {
    try {
      const claimRes = await api.claimCredential(hash);
      if (claimRes.success) {
        alert('Credential claimed and activated in your DIDPass Wallet!');
        fetchCredentials();
      } else {
        alert(claimRes.message || 'Claim failed');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Claim request failed');
    }
  };

  const handleRegisterDid = async () => {
    setRegisteringDid(true);
    try {
      const didUri = `did:didpass:${walletAddress}`;
      
      // Calculate document hash
      const didDocObj = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: didUri,
        verificationMethod: [
          {
            id: `${didUri}#key-1`,
            type: 'EcdsaSecp256k1RecoveryMethod2020',
            controller: didUri,
            blockchainAccountId: `eip155:31337:${walletAddress}`,
          },
        ],
        authentication: [`${didUri}#key-1`],
      };

      const docString = JSON.stringify(didDocObj);
      const documentHash = ethers.solidityPackedKeccak256(['string'], [docString]);

      // Call MetaMask to register DID on DIDRegistry smart contract
      if (!window.ethereum) throw new Error('MetaMask required');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Retrieve DIDRegistry contract details
      const response = await api.api.get('/auth/challenge', { params: { address: walletAddress } }); // dummy test to get config or load contract direct
      // Let's call the contract directly from frontend
      // In hardhat, deployer deployed DIDRegistry. We can get address from config.
      // We will write the contract interactions directly.
      const contractJsonRes = await fetch('http://localhost:4000/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      const dataChallenge = await contractJsonRes.json();
      const didRegAddress = dataChallenge.challenge.domain.verifyingContract;
      
      const didRegAbi = [
        "function registerDID(bytes32 documentHash, string memory didUri) external"
      ];
      
      const didRegistry = new ethers.Contract(didRegAddress, didRegAbi, signer);
      
      alert('Confirm MetaMask transaction to register your Decentralized Identifier (DID) Document on the blockchain.');
      const tx = await didRegistry.registerDID(documentHash, didUri);
      const receipt = await tx.wait();

      // Sync off-chain database
      const syncRes = await api.registerDID({
        walletAddress,
        didUri,
        documentHash,
        publicKey: walletAddress, // simple representation
        txHash: receipt.hash,
      });

      if (syncRes.success) {
        alert('DID successfully registered and resolved!');
        fetchDidDoc();
      }
    } catch (err: any) {
      alert(err.message || 'DID registration rejected');
    } finally {
      setRegisteringDid(false);
    }
  };

  const downloadFile = (hash: string) => {
    const token = localStorage.getItem('didpass_jwt');
    window.open(`http://localhost:4000/api/documents/${hash}/download?token=${token}`, '_blank');
  };

  const handleShowQRTrigger = (hash: string) => {
    setSelectedCredHash(hash);
    setShowQRModal(true);
  };

  return (
    <div className="container">
      {!walletAddress ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <span style={{ fontSize: '4rem' }}>🦊</span>
          <h2 style={{ marginTop: '1.5rem' }}>Access Your Digital Wallet</h2>
          <p>Please connect your MetaMask wallet to view, claim, and present your identity credentials.</p>
          <button onClick={connectWalletHandler} className="btn-primary" style={{ padding: '0.8rem 2rem' }}>
            Connect MetaMask Wallet
          </button>
        </div>
      ) : (
        <div>
          <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="gradient-text" style={{ fontSize: '2rem', margin: 0 }}>👤 Holder Digital Wallet</h2>
                <p style={{ margin: '0.5rem 0 0 0' }}>Manage your verified blockchain credentials and Decentalized Identity document.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setActiveTab('creds')} className={activeTab === 'creds' ? 'btn-primary' : 'btn-glass'} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  📜 My Credentials ({credentials.length})
                </button>
                <button onClick={() => setActiveTab('pending')} className={activeTab === 'pending' ? 'btn-primary' : 'btn-glass'} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  ⏳ Claims ({pendingCredentials.length})
                </button>
                <button onClick={() => setActiveTab('did')} className={activeTab === 'did' ? 'btn-primary' : 'btn-glass'} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  🆔 DID Document
                </button>
              </div>
            </div>
          </div>

          {/* ── DEMO CREDENTIAL BANNER ── shows when wallet has no active credential */}
          {hasActiveCredential === false && !demoResult?.success && (
            <div className="glass fade-in" style={{
              padding: '2rem',
              marginBottom: '2rem',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05))',
              borderRadius: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>🎓</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }} className="gradient-text">Get Your Demo Student ID Credential</h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Your wallet has no active credentials. Issue a real blockchain credential to your wallet in one click — then log in to the University Portal!
                  </p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem' }}>Your Full Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Nirmal Shrestha"
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    style={{ padding: '0.6rem 0.9rem' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem' }}>Email (optional)</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="e.g. you@example.com"
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    style={{ padding: '0.6rem 0.9rem' }}
                  />
                </div>
              </div>
              <button
                onClick={handleIssueDemoCredential}
                disabled={issuingDemo || !demoName.trim()}
                className="btn-primary"
                style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
              >
                {issuingDemo ? (
                  <><div className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', marginRight: '0.5rem' }}></div> Issuing on Blockchain...</>
                ) : (
                  '⚡ Issue Student ID Credential to My Wallet'
                )}
              </button>
              <p style={{ fontSize: '0.75rem', marginTop: '0.75rem', color: 'var(--text-secondary)', margin: '0.75rem 0 0 0' }}>
                This calls the CredentialRegistry smart contract using the TU issuer key. No MetaMask transaction needed — it's a backend call.
              </p>
            </div>
          )}

          {/* Success banner after demo issue */}
          {demoResult?.success && (
            <div className="glass fade-in" style={{
              padding: '1.5rem 2rem',
              marginBottom: '2rem',
              border: '1px solid rgba(16,185,129,0.4)',
              background: 'rgba(16,185,129,0.05)',
              borderRadius: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2rem' }}>✅</span>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--success)' }}>Credential Issued On-Chain!</h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>{demoResult.message}</p>
                  {demoResult.studentId && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', fontFamily: 'monospace' }}>Student ID: <strong>{demoResult.studentId}</strong></p>}
                  {demoResult.txHash && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>Tx: {demoResult.txHash}</p>}
                </div>
              </div>
              <p style={{ marginTop: '1rem', marginBottom: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                🚀 Now go to <a href="http://localhost:3001" target="_blank" style={{ color: 'var(--accent-cyan)' }}>localhost:3001</a> and click "Login with DIDPass"!
              </p>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner"></div>
            </div>
          ) : activeTab === 'creds' ? (
            credentials.length === 0 ? (
              <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>🗃️</span>
                <h3 style={{ marginTop: '1rem' }}>No claimed credentials yet</h3>
                <p>Your verified credentials will appear here once claimed. Check the "Claims" tab.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem',
              }}>
                {credentials.map((c) => (
                  <CredentialCard
                    key={c.id}
                    credential={c}
                    onShowQR={handleShowQRTrigger}
                    onDownload={downloadFile}
                  />
                ))}
              </div>
            )
          ) : activeTab === 'pending' ? (
            pendingCredentials.length === 0 ? (
              <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>✉️</span>
                <h3 style={{ marginTop: '1rem' }}>No pending credential claims</h3>
                <p>New credentials sent to your email or wallet will appear here for verification and signing.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingCredentials.map((c) => {
                  const meta = c.metadata ? JSON.parse(c.metadata) : {};
                  return (
                    <div key={c.id} className="glass fade-in" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>{c.issuer.logoEmoji}</span>
                          <h4 style={{ margin: 0 }}>{c.issuer.name}</h4>
                          <span className="badge badge-warning">Pending Claim</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                          Issued a <strong>{c.credentialType === 'student_id' ? 'Student ID' : 'Bank KYC'}</strong> credential to you.
                        </p>
                        {meta.course && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Course: {meta.course}</span>}
                      </div>

                      <button onClick={() => handleClaim(c.credentialHash)} className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
                        📥 Claim Credential
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // DID DOCUMENT Resolving Panel
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
              {loadingDid ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <div className="spinner"></div>
                </div>
              ) : didDoc ? (
                <div className="glass fade-in" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }} className="gradient-text">✅ DID Document Resolved</h3>
                    <span className="badge badge-success">On-Chain Registered</span>
                  </div>
                  <p>Below is your Decentralized Identifier (DID) Document. This document acts as your public identity profile on the DIDPass network.</p>
                  
                  <pre style={{
                    background: 'rgba(0,0,0,0.4)',
                    padding: '1.5rem',
                    borderRadius: '10px',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#a7f3d0',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    {JSON.stringify(didDoc, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="glass fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '3rem' }}>🆔</span>
                  <h3 style={{ marginTop: '1.5rem' }}>No DID Document Registered</h3>
                  <p style={{ maxWidth: '600px', margin: '0.5rem auto 1.5rem auto' }}>
                    A Decentralized Identifier (DID) is required to issue and verify on-chain documents. You must anchor your public key profile.
                  </p>
                  <button onClick={handleRegisterDid} disabled={registeringDid} className="btn-primary" style={{ padding: '0.8rem 2rem' }}>
                    {registeringDid ? (
                      <>
                        <div className="spinner"></div> Registering on Ethereum...
                      </>
                    ) : (
                      '🔐 Register DID Document on-chain'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* QR Code view Modal */}
      {showQRModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="glass fade-in" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h3>🔐 Present Credential</h3>
            <p>Scan this QR code using any verifier terminal or app to prove credential ownership.</p>
            
            <div style={{ margin: '2rem 0', background: 'white', padding: '1.5rem', borderRadius: '12px', display: 'inline-block' }}>
              {/* Fake QR representation with CSS */}
              <div style={{
                fontFamily: 'monospace',
                fontSize: '8px',
                lineHeight: '8px',
                letterSpacing: '-1.5px',
                color: 'black',
                whiteSpace: 'pre',
              }}>
████████████  ██      ████████████
██        ██  ██  ██  ██        ██
██  ████  ██  ██      ██  ████  ██
██  ████  ██  ██████  ██  ████  ██
██        ██  ██  ██  ██        ██
████████████  ██████  ████████████
              ██  ██              
████  ████    ██  ██  ████████████
  ██    ██  ██  ██      ██    ██  
██  ████  ████  ████    ██  ██    
              ██  ████  ██  ██  ██
████████████  ██  ██  ██  ██  ██  
██        ██  ████    ██████    ██
██  ████  ██    ████  ██    ██    
██  ████  ██  ██████  ████  ████  
██        ██  ██    ████████  ██  
████████████  ████████  ████      
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', wordBreak: 'break-all', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px' }}>
              <strong>Hash:</strong> {selectedCredHash}
            </div>

            <button onClick={() => setShowQRModal(false)} className="btn-primary" style={{ width: '100%' }}>
              Close Modal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
