import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LandingProps {
  walletAddress: string;
  role: string;
  connectWalletHandler: () => Promise<void>;
}

export const Landing: React.FC<LandingProps> = ({
  walletAddress,
  role,
  connectWalletHandler,
}) => {
  const navigate = useNavigate();

  const handlePortalNavigate = (path: string, requiredRole?: string) => {
    if (!walletAddress) {
      alert('Please connect your MetaMask wallet first using the top-right button.');
      connectWalletHandler().then(() => {
        navigate(path);
      }).catch(err => console.log('Wallet connection rejected'));
      return;
    }
    
    if (requiredRole && role !== requiredRole && role !== 'admin') {
      alert(`Access Restricted: Your wallet does not hold the authorized '${requiredRole}' credentials. Contact the administrator to register.`);
      return;
    }

    navigate(path);
  };

  return (
    <div className="fade-in" style={{ position: 'relative' }}>
      {/* Decorative Spheres */}
      <div className="sphere-bg sphere-purple"></div>
      <div className="sphere-bg sphere-cyan"></div>

      <div style={{ textAlign: 'center', padding: '4rem 1.5rem 2rem 1.5rem' }}>
        <span style={{
          fontSize: '0.85rem',
          background: 'rgba(124, 58, 237, 0.1)',
          color: '#c084fc',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          display: 'inline-block',
          marginBottom: '1.5rem',
        }}>
          🇳🇵 Decentralized Trust Engine
        </span>

        <h1 style={{ fontSize: '4.5rem', lineHeight: '1.1', marginBottom: '1.5rem' }}>
          Welcome to <span className="gradient-text">DIDPass</span>
        </h1>
        <p style={{ fontSize: '1.35rem', maxWidth: '700px', margin: '0 auto 2.5rem auto' }}>
          Decentralized Single Sign-On (SSO) and Cryptographic Verifiable Credentials for Nepal. No passwords, no OTPs, absolute security.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {walletAddress ? (
            <button onClick={() => handlePortalNavigate('/holder')} className="btn btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '1.1rem' }}>
              👤 Open Holder Dashboard
            </button>
          ) : (
            <button onClick={connectWalletHandler} className="btn btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '1.1rem' }}>
              🦊 Access Wallet with MetaMask
            </button>
          )}
          <button onClick={() => navigate('/verifier')} className="btn btn-glass" style={{ padding: '0.9rem 2rem', fontSize: '1.1rem' }}>
            🔍 Verify Credential Hash
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="glass" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '2rem',
        padding: '2rem',
        margin: '3rem auto',
        maxWidth: '1000px',
        textAlign: 'center',
      }}>
        <div>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }} className="gradient-text">AES-256-GCM</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Encrypted Document Storage</p>
        </div>
        <div>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }} className="gradient-text">4-Check Flow</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Strict Blockchain Verification</p>
        </div>
        <div>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }} className="gradient-text">Zero Passwords</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>EIP-712 Typed Wallet Signatures</p>
        </div>
      </div>

      {/* Portal Cards Selector */}
      <div style={{ margin: '4rem 0' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2.5rem', fontSize: '2.25rem' }}>Ecosystem Portals</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
        }}>
          <div className="glass" onClick={() => handlePortalNavigate('/issuer', 'issuer')} style={{ padding: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</span>
            <h3>Issuer Portal</h3>
            <p style={{ fontSize: '0.95rem', flexGrow: 1 }}>
              For Universities & Banks (Tribhuvan University, Nabil Bank) to upload transcripts, encrypt credentials, and anchor SHA-256 hashes on the blockchain.
            </p>
            <span style={{ color: 'var(--accent-purple)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem' }}>
              Enter Issuer →
            </span>
          </div>

          <div className="glass" onClick={() => handlePortalNavigate('/holder')} style={{ padding: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</span>
            <h3>Holder Wallet</h3>
            <p style={{ fontSize: '0.95rem', flexGrow: 1 }}>
              For students and users (like Nirmal Shrestha). View credentials, download decrypted transcripts, generate secure QR codes, and claim new IDs.
            </p>
            <span style={{ color: 'var(--accent-purple)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem' }}>
              Enter Wallet →
            </span>
          </div>

          <div className="glass" onClick={() => navigate('/verifier')} style={{ padding: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</span>
            <h3>Verifier Engine</h3>
            <p style={{ fontSize: '0.95rem', flexGrow: 1 }}>
              Third-party portal. Input any credential SHA-256 hash to perform a deep verification check (Existence, Issuer status, Revocation, and Expiry).
            </p>
            <span style={{ color: 'var(--accent-purple)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem' }}>
              Open Verifier →
            </span>
          </div>

          <div className="glass" onClick={() => handlePortalNavigate('/admin', 'admin')} style={{ padding: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</span>
            <h3>Platform Admin</h3>
            <p style={{ fontSize: '0.95rem', flexGrow: 1 }}>
              Register new approved institutions (Universities, Banks) and inspect the platform's Winston audit log activity stream.
            </p>
            <span style={{ color: 'var(--accent-purple)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem' }}>
              Open Admin →
            </span>
          </div>
        </div>
      </div>

      {/* How it Works Walkthrough */}
      <div className="glass" style={{ padding: '3rem', margin: '4rem 0' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2.25rem' }}>How "Login with DIDPass" Works</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2rem',
          position: 'relative',
        }}>
          <div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              marginBottom: '1rem',
            }}>1</div>
            <h4>Ecosystem Request</h4>
            <p style={{ fontSize: '0.85rem' }}>
              User clicks "Login with DIDPass" on a client website (e.g. Tribhuvan University Portal). Client requests validation.
            </p>
          </div>

          <div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              marginBottom: '1rem',
            }}>2</div>
            <h4>EIP-712 Challenge</h4>
            <p style={{ fontSize: '0.85rem' }}>
              DIDPass generates a cryptographically unique nonce. MetaMask pops up asking the user to sign the typed challenge.
            </p>
          </div>

          <div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              marginBottom: '1rem',
            }}>3</div>
            <h4>4-Check Verification</h4>
            <p style={{ fontSize: '0.85rem' }}>
              The signature is validated. The backend queries the smart contracts to verify existence, issuer status, revocation, and expiry.
            </p>
          </div>

          <div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              marginBottom: '1rem',
            }}>4</div>
            <h4>SSO Token Redirect</h4>
            <p style={{ fontSize: '0.85rem' }}>
              Once verified, the backend issues a secure JWT token, redirecting the user back. The client website logs them in instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
