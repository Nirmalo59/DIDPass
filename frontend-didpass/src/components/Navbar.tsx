import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { truncateAddress } from '../utils/metamask';

interface NavbarProps {
  walletAddress: string;
  role: string;
  connectWalletHandler: () => Promise<void>;
  disconnectWalletHandler: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  walletAddress,
  role,
  connectWalletHandler,
  disconnectWalletHandler,
}) => {
  const navigate = useNavigate();

  return (
    <nav className="glass" style={{
      position: 'sticky',
      top: '1rem',
      margin: '0 auto 2rem auto',
      width: 'calc(100% - 2rem)',
      maxWidth: '1200px',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.8rem' }}>🛡️</span>
          <span className="gradient-text" style={{ fontSize: '1.4rem', fontWeight: 800 }}>DIDPass</span>
        </Link>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, padding: '0.25rem 0.5rem' }}>Home</Link>
          
          {role === 'issuer' && (
            <Link to="/issuer" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, borderBottom: '2px solid var(--accent-purple)', padding: '0.25rem 0.5rem' }}>Issuer Portal</Link>
          )}
          {role === 'holder' && walletAddress && (
            <Link to="/holder" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, borderBottom: '2px solid var(--accent-purple)', padding: '0.25rem 0.5rem' }}>My Wallet</Link>
          )}
          {role === 'admin' && (
            <>
              <Link to="/admin" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, borderBottom: '2px solid var(--accent-purple)', padding: '0.25rem 0.5rem' }}>Admin Portal</Link>
              <Link to="/issuer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, padding: '0.25rem 0.5rem' }}>Issuer</Link>
            </>
          )}
          <Link to="/verifier" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, padding: '0.25rem 0.5rem' }}>Verify Hash</Link>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {walletAddress ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {role && (
              <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                {role}
              </span>
            )}
            <div className="glass" style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--success)',
                boxShadow: '0 0 8px var(--success)',
              }}></span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'monospace' }}>
                {truncateAddress(walletAddress)}
              </span>
            </div>
            <button onClick={disconnectWalletHandler} className="btn-danger" style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              Disconnect
            </button>
          </div>
        ) : (
          <button onClick={connectWalletHandler} className="btn-primary" style={{ padding: '0.5rem 1.25rem', borderRadius: '10px' }}>
            🦊 Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
};
