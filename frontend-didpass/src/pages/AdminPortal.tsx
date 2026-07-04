import React, { useState, useEffect } from 'react';
import * as api from '../utils/api';
import { truncateAddress } from '../utils/metamask';

export const AdminPortal: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('university');
  const [logoEmoji, setLogoEmoji] = useState('🏛️');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  
  const [registering, setRegistering] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Platform stats
  const [stats, setStats] = useState({
    issuersCount: 2,
    credentialsCount: 4,
    revocationsCount: 1,
    activeSessions: 3,
  });

  useEffect(() => {
    fetchAuditLogs();
    fetchStats();
  }, []);

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.getAuditLogs();
      if (res.success) {
        setAuditLogs(res.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.getIssuers();
      if (res.success) {
        setStats(prev => ({
          ...prev,
          issuersCount: res.issuers.length,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterIssuerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !name) {
      alert('Please fill in required fields');
      return;
    }

    setRegistering(true);
    try {
      const res = await api.registerIssuer({
        walletAddress,
        name,
        type,
        logoEmoji,
        email: email || undefined,
        website: website || undefined,
      });

      if (res.success) {
        alert(`Successfully registered approved issuer: ${name}`);
        setWalletAddress('');
        setName('');
        setEmail('');
        setWebsite('');
        setLogoEmoji('🏛️');
        fetchStats();
        fetchAuditLogs();
      } else {
        alert(res.message || 'Registration failed');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Issuer registration failed');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="container">
      <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 className="gradient-text" style={{ fontSize: '2rem', margin: 0 }}>⚙️ Admin Portal</h2>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          Configure trusted ecosystem issuers, monitor system health, and inspect immutable audit ledgers.
        </p>
      </div>

      {/* Platform Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.25rem 0' }} className="gradient-text">{stats.issuersCount}</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Trusted Issuers Approved</p>
        </div>

        <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.25rem 0' }} className="gradient-text">{stats.credentialsCount}</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Credentials Anchored</p>
        </div>

        <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.25rem 0' }} className="gradient-text">{stats.revocationsCount}</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Immutable Revocations</p>
        </div>

        <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.25rem 0' }} className="gradient-text">{stats.activeSessions}</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>SSO Audited Actions</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Register Issuer Form */}
        <form className="glass" onSubmit={handleRegisterIssuerSubmit} style={{ padding: '2rem', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Approve New Issuer</h3>
          
          <div className="form-group">
            <label>Institution Wallet Address</label>
            <input
              type="text"
              required
              placeholder="0x..."
              className="input-field"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Institution Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Tribhuvan University"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Institution Type</label>
              <select
                className="input-field"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="university">University</option>
                <option value="bank">Bank</option>
                <option value="government">Government</option>
              </select>
            </div>

            <div className="form-group">
              <label>Display Emoji Logo</label>
              <input
                type="text"
                required
                placeholder="e.g. 🏛️"
                className="input-field"
                value={logoEmoji}
                onChange={(e) => setLogoEmoji(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Official Email</label>
            <input
              type="email"
              placeholder="contact@institution.edu"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button type="submit" disabled={registering} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {registering ? 'Adding Issuer...' : '✅ Authorize Approved Issuer'}
          </button>
        </form>

        {/* Audit Log Stream */}
        <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Winston Compliance Audit Log</h3>
            <button onClick={fetchAuditLogs} className="btn-glass" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              🔄 Refresh
            </button>
          </div>

          {loadingLogs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', flexGrow: 1 }}>
              <div className="spinner"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', flexGrow: 1 }}>
              No audit logs captured in SQLite log table.
            </div>
          ) : (
            <div style={{
              overflowY: 'auto',
              maxHeight: '400px',
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              paddingRight: '0.5rem',
            }}>
              {auditLogs.map((log) => {
                const details = JSON.parse(log.details || '{}');
                return (
                  <div key={log.id} style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{log.actionType}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ wordBreak: 'break-all', fontWeight: 600 }}>
                      Actor: {truncateAddress(log.actor)}
                    </div>
                    {details.credentialType && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        Requested Credential: {details.credentialType}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
