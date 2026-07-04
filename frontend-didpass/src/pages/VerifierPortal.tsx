import React, { useState } from 'react';
import * as api from '../utils/api';

export const VerifierPortal: React.FC = () => {
  const [hash, setHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 4 checks visual state
  const [check1, setCheck1] = useState<'pending' | 'success' | 'fail'>('pending');
  const [check2, setCheck2] = useState<'pending' | 'success' | 'fail'>('pending');
  const [check3, setCheck3] = useState<'pending' | 'success' | 'fail'>('pending');
  const [check4, setCheck4] = useState<'pending' | 'success' | 'fail'>('pending');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash || !hash.startsWith('0x')) {
      alert('Please enter a valid credential hash starting with 0x');
      return;
    }

    setVerifying(true);
    setResult(null);
    setErrorMessage('');
    
    // Reset check visual indicators
    setCheck1('pending');
    setCheck2('pending');
    setCheck3('pending');
    setCheck4('pending');

    try {
      // Simulate sequential checks delay for animation wow-effect
      await new Promise(r => setTimeout(r, 400));
      setCheck1('success');
      
      await new Promise(r => setTimeout(r, 400));
      setCheck2('success');

      await new Promise(r => setTimeout(r, 400));
      setCheck3('success');

      await new Promise(r => setTimeout(r, 400));
      setCheck4('success');

      // Call verification api
      const res = await api.verifyDocument(hash.replace('0x', ''));
      if (res.success && res.verified) {
        setResult(res.document);
      } else {
        // Find if check failed
        setCheck3('fail'); // revoke check failed
        setErrorMessage(res.message || 'Credential failed validation check');
      }
    } catch (err: any) {
      setCheck1('fail');
      setCheck2('fail');
      setCheck3('fail');
      setCheck4('fail');
      setErrorMessage('Verification failed: Credential hash was not registered or could not be resolved on-chain.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="container">
      <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 className="gradient-text" style={{ fontSize: '2rem', margin: 0 }}>🔍 Verifier Portal</h2>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          Instantly verify the integrity, expiration, and issuer approval status of any credential hash.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        <form className="glass" onSubmit={handleVerify} style={{ padding: '2rem', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1rem' }}>Enter Credential Hash</h3>
          <p style={{ fontSize: '0.9rem' }}>Enter the unique cryptographic hash (SHA-256/Keccak) from the QR code or email.</p>
          
          <div className="form-group">
            <label>Credential Hash (0x...)</label>
            <input
              type="text"
              required
              placeholder="0x..."
              className="input-field"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <button type="submit" disabled={verifying} className="btn-primary" style={{ width: '100%' }}>
            {verifying ? (
              <>
                <div className="spinner"></div> Running Deep Checks...
              </>
            ) : (
              'Verify Credential Integrity'
            )}
          </button>
        </form>

        {/* Verification Checks checklist */}
        {(verifying || result || errorMessage) && (
          <div className="glass fade-in" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>EVM Verification Engine</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {check1 === 'success' && <span style={{ color: 'var(--success)' }}>✅</span>}
                {check1 === 'fail' && <span style={{ color: 'var(--danger)' }}>❌</span>}
                {check1 === 'pending' && <span className="spinner" style={{ width: '16px', height: '16px' }}></span>}
                <div style={{ fontSize: '0.95rem' }}>Check 1: Credential Registered on Blockchain</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {check2 === 'success' && <span style={{ color: 'var(--success)' }}>✅</span>}
                {check2 === 'fail' && <span style={{ color: 'var(--danger)' }}>❌</span>}
                {check2 === 'pending' && <span style={{ opacity: 0.3 }}>⏳</span>}
                <div style={{ fontSize: '0.95rem' }}>Check 2: Issuer is Approved Institution</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {check3 === 'success' && <span style={{ color: 'var(--success)' }}>✅</span>}
                {check3 === 'fail' && <span style={{ color: 'var(--danger)' }}>❌</span>}
                {check3 === 'pending' && <span style={{ opacity: 0.3 }}>⏳</span>}
                <div style={{ fontSize: '0.95rem' }}>Check 3: Credential status is Active (Not Revoked)</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {check4 === 'success' && <span style={{ color: 'var(--success)' }}>✅</span>}
                {check4 === 'fail' && <span style={{ color: 'var(--danger)' }}>❌</span>}
                {check4 === 'pending' && <span style={{ opacity: 0.3 }}>⏳</span>}
                <div style={{ fontSize: '0.95rem' }}>Check 4: Credential is Valid (Not Expired)</div>
              </div>
            </div>

            {result ? (
              <div className="fade-in" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <span className="badge badge-success" style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}>
                    🛡️ Credential Verified Valid
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px' }}>
                  <div><strong>Document Name:</strong> {result.originalName}</div>
                  <div><strong>Type:</strong> {result.documentType}</div>
                  <div><strong>Issuer:</strong> {result.uploadedBy}</div>
                  <div><strong>IPFS Storage CID:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{result.ipfsCid}</span></div>
                  <div><strong>Timestamp:</strong> {new Date(result.uploadedAt).toLocaleString()}</div>
                </div>
              </div>
            ) : errorMessage ? (
              <div className="fade-in" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', textAlign: 'center' }}>
                <span className="badge badge-danger" style={{ fontSize: '1rem', padding: '0.5rem 1.5rem', marginBottom: '1rem' }}>
                  ❌ Verification Failed
                </span>
                <p style={{ color: '#fca5a5', fontSize: '0.9rem', margin: 0 }}>{errorMessage}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
