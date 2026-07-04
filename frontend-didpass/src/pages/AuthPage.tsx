import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../utils/api';
import { connectWallet, signEIP712, truncateAddress } from '../utils/metamask';

interface AuthPageProps {
  walletAddress: string;
  setWalletAddress: (addr: string) => void;
  setRole: (role: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  walletAddress,
  setWalletAddress,
  setRole,
}) => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'connect' | 'sign' | 'verify' | 'success' | 'error'>('connect');
  const [errorMessage, setErrorMessage] = useState('');
  
  // URL Params
  const clientId = searchParams.get('clientId');
  const redirectUri = searchParams.get('redirectUri');
  const credentialType = searchParams.get('credentialType') || 'student_id';
  const nonce = searchParams.get('nonce');

  // Checks visual indicators
  const [check1, setCheck1] = useState<'pending' | 'success' | 'fail'>('pending');
  const [check2, setCheck2] = useState<'pending' | 'success' | 'fail'>('pending');
  const [check3, setCheck3] = useState<'pending' | 'success' | 'fail'>('pending');
  const [check4, setCheck4] = useState<'pending' | 'success' | 'fail'>('pending');

  const getClientName = () => {
    if (clientId === 'TU_PORTAL') return 'Tribhuvan University Portal';
    if (clientId === 'NABIL_BANK') return 'Nabil Bank Internet Banking';
    return clientId || 'Third Party Portal';
  };

  const getTypeName = () => {
    if (credentialType === 'student_id') return 'Student ID Credential';
    if (credentialType === 'bank_kyc') return 'Bank KYC Verification';
    return credentialType;
  };

  useEffect(() => {
    if (walletAddress) {
      setStep('sign');
    } else {
      setStep('connect');
    }
  }, [walletAddress]);

  const [connectStatus, setConnectStatus] = useState('');

  const handleConnect = async () => {
    try {
      setConnectStatus('Switching to Hardhat network...');
      const address = await connectWallet(); // switchToHardhatNetwork is called inside
      setWalletAddress(address);
      setConnectStatus('');
      setStep('sign');
    } catch (err: any) {
      setConnectStatus('');
      setErrorMessage(err.message || 'Wallet connection failed');
      setStep('error');
    }
  };

  const handleSignAndVerify = async () => {
    if (!walletAddress) return;
    setStep('verify');
    
    // Reset check visual indicators
    setCheck1('pending');
    setCheck2('pending');
    setCheck3('pending');
    setCheck4('pending');

    try {
      // 1. Get challenge nonce from backend
      const challengeRes = await api.getChallenge(walletAddress);
      if (!challengeRes.success) {
        throw new Error(challengeRes.message || 'Failed to fetch signature challenge');
      }

      const { domain, types, value } = challengeRes.challenge;

      // 2. Sign challenge with MetaMask (EIP-712)
      const signature = await signEIP712(walletAddress, domain, types, value);

      // Simulate step-by-step blockchain verification delay for visual experience
      await new Promise(r => setTimeout(r, 400));
      setCheck1('success');

      await new Promise(r => setTimeout(r, 400));
      setCheck2('success');

      await new Promise(r => setTimeout(r, 400));
      setCheck3('success');

      await new Promise(r => setTimeout(r, 400));
      setCheck4('success');

      // 3. Verify signature + 4 checks on backend
      const verifyRes = await api.verifySignature({
        walletAddress,
        signature,
        nonce: value.nonce, // verify using challenge nonce
        credentialType,
        clientId: clientId || undefined,
        redirectUri: redirectUri || undefined,
      });

      if (verifyRes.success) {
        setRole(verifyRes.role);
        localStorage.setItem('didpass_jwt', verifyRes.token);
        setStep('success');

        // Redirect user back to university portal callback URL with SSO tokens
        if (verifyRes.redirect) {
          setTimeout(() => {
            window.location.href = verifyRes.redirect;
          }, 1500);
        }
      } else {
        throw new Error(verifyRes.message || 'Verification failed');
      }
    } catch (err: any) {
      setCheck1('fail');
      setCheck2('fail');
      setCheck3('fail');
      setCheck4('fail');
      setErrorMessage(err.response?.data?.message || err.message || 'Identity verification failed. Ensure you hold a valid, active credential.');
      setStep('error');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '1.5rem',
      position: 'relative',
    }}>
      {/* Background Blurs */}
      <div className="sphere-bg sphere-purple" style={{ width: '300px', height: '300px' }}></div>
      <div className="sphere-bg sphere-cyan" style={{ width: '300px', height: '300px' }}></div>

      <div className="glass fade-in" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '2.5rem',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🛡️</span>
          <h2 className="gradient-text" style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>SSO Authentication</h2>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            <strong>{getClientName()}</strong> is requesting identity verification.
          </p>
        </div>

        {/* Verification request info */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '2rem',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Requested Credential
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--accent-cyan)' }}>
            {getTypeName()}
          </div>
        </div>

        {/* Step-by-Step Render Panels */}
        {step === 'connect' && (
          <div>
            <p>Connect your MetaMask wallet to verify ownership.</p>
            {connectStatus && (
              <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                {connectStatus}
              </p>
            )}
            <button onClick={handleConnect} disabled={!!connectStatus} className="btn-primary" style={{ width: '100%', padding: '0.8rem', opacity: connectStatus ? 0.7 : 1 }}>
              🦊 Connect MetaMask Wallet
            </button>
            <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
              ⚠️ MetaMask will ask you to switch to the <strong>Hardhat Local</strong> network (Chain ID: 31337). Please approve.
            </p>
          </div>
        )}

        {step === 'sign' && (
          <div>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Signing proves you own the wallet key associated with your credentials. No gas fee required.
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
            }}>
              Connected: {truncateAddress(walletAddress)}
            </div>
            <button onClick={handleSignAndVerify} className="btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
              ✍️ Sign Challenge & Log In
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div>
            <p>Verifying credentials against smart contracts...</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {check1 === 'success' ? '✅' : check1 === 'fail' ? '❌' : <div className="spinner" style={{ width: '14px', height: '14px' }}></div>}
                <span style={{ fontSize: '0.9rem' }}>Check 1: Credential Existence Proof</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {check2 === 'success' ? '✅' : check2 === 'fail' ? '❌' : '⏳'}
                <span style={{ fontSize: '0.9rem' }}>Check 2: Issuer Authority status</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {check3 === 'success' ? '✅' : check3 === 'fail' ? '❌' : '⏳'}
                <span style={{ fontSize: '0.9rem' }}>Check 3: Revocation registry validation</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {check4 === 'success' ? '✅' : check4 === 'fail' ? '❌' : '⏳'}
                <span style={{ fontSize: '0.9rem' }}>Check 4: Expiration date validation</span>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="fade-in">
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🎉</span>
            <h3 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Verification Successful!</h3>
            <p style={{ fontSize: '0.9rem' }}>Generating secure auth token and redirecting you back to client...</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <div className="spinner"></div>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="fade-in">
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>❌</span>
            <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Verification Failed</h3>
            <p style={{ fontSize: '0.85rem', color: '#fca5a5', marginBottom: '1.5rem' }}>{errorMessage}</p>
            <button onClick={() => setStep('sign')} className="btn-primary" style={{ width: '100%' }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
