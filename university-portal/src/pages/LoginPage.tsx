import React from 'react';

export const LoginPage: React.FC = () => {
  const handleLogin = () => {
    // Generate random nonce to prevent replay attacks
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Redirect to DIDPass (Website 1, port 3000) auth gate
    const didpassAuthUrl = `http://localhost:3000/auth?clientId=TU_PORTAL&redirectUri=http://localhost:3001/callback&credentialType=student_id&nonce=${nonce}`;
    window.location.href = didpassAuthUrl;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* University Top Header */}
      <header className="university-header">
        <div className="university-logo-container">
          <span className="university-logo">🏛️</span>
          <div>
            <h1 className="university-title">Tribhuvan University</h1>
            <h2 className="university-subtitle">Office of the Controller of Examinations</h2>
          </div>
        </div>
        <span style={{ fontSize: '0.85rem', color: '#90caf9', fontWeight: 600 }}>Kirtipur, Nepal</span>
      </header>

      {/* Main Login Body */}
      <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card fade-in" style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
          
          <div style={{ marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🎓</span>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Student Grade Portal</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', margin: 0 }}>
              Access your official transcripts, exam results, and academic reports.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '2rem 0', margin: '2rem 0' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontFamily: 'Inter, sans-serif', color: 'var(--text-dark)' }}>
              Secure Passwordless Authentication
            </h3>
            
            <button onClick={handleLogin} className="btn-didpass" style={{ width: '100%' }}>
              🔐 Login with DIDPass
            </button>
            
            <p style={{ color: 'var(--text-light)', fontSize: '0.75rem', marginTop: '1rem', marginBottom: 0 }}>
              Using EIP-712 cryptographic signature to authenticate wallet keys.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'var(--text-light)', fontSize: '0.8rem' }}>
            <span>Powered by</span>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>🛡️ DIDPass</span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '1.5rem', borderTop: '1px solid var(--border)', color: 'var(--text-light)', fontSize: '0.8rem' }}>
        © 2026 Tribhuvan University. All rights reserved. Blockchain Integrations by DIDPass.
      </footer>
    </div>
  );
};
