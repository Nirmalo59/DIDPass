import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export const CallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const walletAddress = searchParams.get('walletAddress');
    const holderName = searchParams.get('holderName');
    const success = searchParams.get('success');

    if (!success || !token) {
      setErrorText('Authentication request rejected by DIDPass.');
      setStatus('error');
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    // Verify token validity with backend
    axios.get('http://localhost:4000/api/auth/verify-token', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (res.data.success) {
          // Save session
          localStorage.setItem('tu_session', JSON.stringify({
            token,
            walletAddress,
            holderName,
          }));
          setStatus('success');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          throw new Error('Token verification failed');
        }
      })
      .catch((err) => {
        setErrorText('SSO session verification failed.');
        setStatus('error');
        setTimeout(() => navigate('/'), 3000);
      });
  }, [searchParams, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9' }}>
      <div className="card fade-in" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        {status === 'verifying' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div className="spinner"></div>
            <h3>Verifying DIDPass Token...</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
              Performing cryptographic validation on back-end server.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '3rem' }}>✅</span>
            <h3 style={{ color: 'var(--success)' }}>Access Authorized!</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
              Welcome back. Redirecting to student dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '3rem' }}>❌</span>
            <h3 style={{ color: 'var(--accent)' }}>Login Failed</h3>
            <p style={{ color: '#c62828', fontSize: '0.9rem', margin: 0 }}>{errorText}</p>
          </div>
        )}
      </div>
    </div>
  );
};
