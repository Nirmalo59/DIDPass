import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<{ token: string; walletAddress: string; holderName: string } | null>(null);

  useEffect(() => {
    const rawSession = localStorage.getItem('tu_session');
    if (!rawSession) {
      navigate('/');
      return;
    }
    setSession(JSON.parse(rawSession));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('tu_session');
    navigate('/');
  };

  if (!session) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      {/* University Header */}
      <header className="university-header">
        <div className="university-logo-container">
          <span className="university-logo">🏛️</span>
          <div>
            <h1 className="university-title">Tribhuvan University</h1>
            <h2 className="university-subtitle">Office of the Controller of Examinations</h2>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
            Active Session: <strong>{session.holderName}</strong>
          </span>
          <button onClick={handleLogout} className="btn-logout">
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main style={{ flexGrow: 1, padding: '2rem 3rem' }} className="fade-in">
        
        {/* Verification Success Banner */}
        <div style={{
          backgroundColor: 'var(--success-bg)',
          border: '1px solid rgba(27, 94, 32, 0.2)',
          borderRadius: '8px',
          padding: '1.25rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <span style={{ fontSize: '1.75rem' }}>✅</span>
          <div>
            <h3 style={{ margin: 0, color: 'var(--success)', fontSize: '1.1rem' }}>Identity Verified via DIDPass</h3>
            <p style={{ margin: 0, color: 'var(--success)', fontSize: '0.85rem' }}>
              Authentication proof successfully verified against the decentralized Ethereum ledger (Wallet: {session.walletAddress}).
            </p>
          </div>
        </div>

        <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
          Academic Dashboard
        </h2>

        {/* Academic Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem',
        }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Student Registration ID</span>
            <h3 style={{ fontSize: '1.6rem', marginTop: '0.5rem', fontFamily: 'Inter, sans-serif' }}>TU-2024-CS-001</h3>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Program / Faculty</span>
            <h3 style={{ fontSize: '1.6rem', marginTop: '0.5rem', fontFamily: 'Inter, sans-serif' }}>B.Sc. Computer Science</h3>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Cumulative GPA</span>
            <h3 style={{ fontSize: '1.6rem', marginTop: '0.5rem', fontFamily: 'Inter, sans-serif' }}>3.87 / 4.00</h3>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Total Completed Credits</span>
            <h3 style={{ fontSize: '1.6rem', marginTop: '0.5rem', fontFamily: 'Inter, sans-serif' }}>120 / 160</h3>
          </div>
        </div>

        {/* Grades Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2.5rem' }}>
          
          {/* Semester 1 Results */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              Semester 1 Results (Spring Session)
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Code</th>
                  <th>Credits</th>
                  <th>Grade</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Data Structures & Algorithms</td>
                  <td>CS201</td>
                  <td>3</td>
                  <td><strong>A+</strong></td>
                  <td>4.0</td>
                </tr>
                <tr>
                  <td>Operating Systems</td>
                  <td>CS202</td>
                  <td>3</td>
                  <td><strong>A</strong></td>
                  <td>4.0</td>
                </tr>
                <tr>
                  <td>Computer Networks</td>
                  <td>CS203</td>
                  <td>3</td>
                  <td><strong>B+</strong></td>
                  <td>3.3</td>
                </tr>
                <tr>
                  <td>Engineering Mathematics</td>
                  <td>MTH201</td>
                  <td>3</td>
                  <td><strong>A</strong></td>
                  <td>4.0</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Semester 2 Results */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              Semester 2 Results (Autumn Session)
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Code</th>
                  <th>Credits</th>
                  <th>Grade</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Artificial Intelligence</td>
                  <td>CS301</td>
                  <td>3</td>
                  <td><strong>A+</strong></td>
                  <td>4.0</td>
                </tr>
                <tr>
                  <td>Blockchain Technology</td>
                  <td>CS302</td>
                  <td>3</td>
                  <td><strong>A+</strong></td>
                  <td>4.0</td>
                </tr>
                <tr>
                  <td>Web Development</td>
                  <td>CS303</td>
                  <td>3</td>
                  <td><strong>A</strong></td>
                  <td>4.0</td>
                </tr>
                <tr>
                  <td>Information Security</td>
                  <td>CS304</td>
                  <td>3</td>
                  <td><strong>B+</strong></td>
                  <td>3.3</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* Verification Blockchain Info Box */}
        <div className="card" style={{ padding: '1.5rem 2rem', backgroundColor: '#f8fafc', borderStyle: 'dashed' }}>
          <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '0.5rem', fontFamily: 'Inter, sans-serif' }}>
            🛡️ Cryptographic Session Proof
          </h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)' }}>
            This session is authenticated by verifying your wallet address (<strong>{session.walletAddress}</strong>) and proving ownership of the corresponding Student ID credential. Verification queries executed on the local Hardhat Node (Chain ID: 31337). No credentials or private keys are transmitted during this handshake.
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '1.5rem', borderTop: '1px solid var(--border)', color: 'var(--text-light)', fontSize: '0.8rem', marginTop: '2rem' }}>
        © 2026 Tribhuvan University. All rights reserved. Blockchain Integrations by DIDPass.
      </footer>
    </div>
  );
};
