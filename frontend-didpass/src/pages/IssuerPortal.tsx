import React, { useState, useEffect } from 'react';
import { CredentialCard, CredentialType } from '../components/CredentialCard';
import * as api from '../utils/api';

interface IssuerPortalProps {
  walletAddress: string;
}

export const IssuerPortal: React.FC<IssuerPortalProps> = ({ walletAddress }) => {
  const [activeTab, setActiveTab] = useState<'issue' | 'list'>('issue');
  
  // Issuance states
  const [holderAddress, setHolderAddress] = useState('');
  const [holderName, setHolderName] = useState('');
  const [holderEmail, setHolderEmail] = useState('');
  const [credentialType, setCredentialType] = useState('student_id');
  const [expiresAt, setExpiresAt] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  
  const [issuing, setIssuing] = useState(false);
  const [issuedCred, setIssuedCred] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // List states
  const [issuedList, setIssuedList] = useState<CredentialType[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // Revocation modal
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedHash, setSelectedHash] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (activeTab === 'list' && walletAddress) {
      fetchIssuedCredentials();
    }
  }, [activeTab, walletAddress]);

  const fetchIssuedCredentials = async () => {
    setLoadingList(true);
    try {
      // Find credentials where issuer is current wallet
      const res = await api.getWalletCredentials(walletAddress);
      if (res.success) {
        // filter credentials to show only those issued by this wallet
        const filtered = res.credentials.filter((c: any) => c.issuerAddress.toLowerCase() === walletAddress.toLowerCase());
        setIssuedList(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentFile(e.target.files[0]);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssuing(true);
    setErrorMessage('');
    setIssuedCred(null);

    try {
      let docHash = '';
      let ipfsCid = '';
      let encPath = '';

      // Step 1: Upload document if attached
      if (documentFile) {
        const formData = new FormData();
        formData.append('document', documentFile);
        formData.append('documentType', credentialType === 'student_id' ? 'transcript' : 'kyc_document');
        
        const uploadRes = await api.uploadDocument(formData);
        if (uploadRes.success) {
          docHash = uploadRes.document.sha256Hash;
          ipfsCid = uploadRes.document.ipfsCid;
          encPath = uploadRes.document.encryptedFilePath;
        } else {
          throw new Error(uploadRes.message || 'File upload encryption failed');
        }
      }

      // Step 2: Issue credential
      const issueRes = await api.issueCredential({
        holderAddress,
        holderName,
        holderEmail,
        credentialType,
        expiresAt: expiresAt || undefined,
        documentHash: docHash || undefined,
        ipfsCid: ipfsCid || undefined,
        encryptedFilePath: encPath || undefined,
        metadata: {
          studentId: credentialType === 'student_id' ? 'TU-2024-CS-' + Math.floor(100 + Math.random() * 900) : undefined,
          course: credentialType === 'student_id' ? 'B.Sc. Computer Science' : undefined,
          kycStatus: credentialType === 'bank_kyc' ? 'VERIFIED_LEVEL_3' : undefined,
        }
      });

      if (issueRes.success) {
        setIssuedCred(issueRes.credential);
        // Clear form
        setHolderAddress('');
        setHolderName('');
        setHolderEmail('');
        setExpiresAt('');
        setDocumentFile(null);
        // Reset file input
        const fileInput = document.getElementById('doc-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setErrorMessage(issueRes.message || 'Issuance failed');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Issuance transaction failed');
    } finally {
      setIssuing(false);
    }
  };

  const handleRevokeTrigger = (hash: string) => {
    setSelectedHash(hash);
    setRevokeReason('');
    setShowRevokeModal(true);
  };

  const handleConfirmRevoke = async () => {
    setRevoking(true);
    try {
      const res = await api.revokeCredential(selectedHash, revokeReason);
      if (res.success) {
        setShowRevokeModal(false);
        fetchIssuedCredentials();
        alert('Credential successfully revoked on the blockchain.');
      } else {
        alert(res.message || 'Revocation failed');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Revocation request failed');
    } finally {
      setRevoking(false);
    }
  };

  const downloadEncryptedFile = async (hash: string) => {
    try {
      window.open(`http://localhost:4000/api/documents/${hash}/download?token=${localStorage.getItem('didpass_jwt')}`, '_blank');
    } catch (err) {
      alert('Failed to download document');
    }
  };

  return (
    <div className="container">
      <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 className="gradient-text" style={{ fontSize: '2rem', margin: 0 }}>🏛️ Issuer Portal</h2>
        <p style={{ margin: '0.5rem 0 1.5rem 0' }}>
          Issue blockchain-anchored digital credentials and encrypt academic/financial records.
        </p>

        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
          <button onClick={() => setActiveTab('issue')} className={activeTab === 'issue' ? 'btn-primary' : 'btn-glass'} style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
            ✍️ Issue Credential
          </button>
          <button onClick={() => setActiveTab('list')} className={activeTab === 'list' ? 'btn-primary' : 'btn-glass'} style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
            📋 Issued Credentials
          </button>
        </div>
      </div>

      {activeTab === 'issue' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {issuedCred && (
            <div className="glass fade-in" style={{ padding: '2rem', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>✅</span>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--success)' }}>Credential Issued Successfully!</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>The record has been written to the Ethereum block ledger.</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', fontFamily: 'monospace' }}>
                <div><strong>Credential Hash:</strong> {issuedCred.credentialHash}</div>
                <div><strong>Blockchain Tx:</strong> {issuedCred.txHash}</div>
                <div><strong>Recipient:</strong> {issuedCred.holderName} ({issuedCred.holderAddress})</div>
                {issuedCred.ipfsCid && <div><strong>IPFS CID:</strong> {issuedCred.ipfsCid}</div>}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="glass fade-in" style={{ padding: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.03)', color: '#fca5a5' }}>
              <strong>Error:</strong> {errorMessage}
            </div>
          )}

          <form className="glass" onSubmit={handleIssueSubmit} style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Issue New Digital Credential</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Student/Holder Wallet Address (MetaMask)</label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  className="input-field"
                  value={holderAddress}
                  onChange={(e) => setHolderAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Holder Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nirmal Shrestha"
                  className="input-field"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Holder Email Address (For Notification)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. nirmal.shrestha@gmail.com"
                  className="input-field"
                  value={holderEmail}
                  onChange={(e) => setHolderEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Credential Type</label>
                <select
                  className="input-field"
                  value={credentialType}
                  onChange={(e) => setCredentialType(e.target.value)}
                >
                  <option value="student_id">🎓 Student ID (University Portal)</option>
                  <option value="bank_kyc">🏦 Bank KYC Credential (Nabil Bank)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Expiry Date (Optional)</label>
                <input
                  type="date"
                  className="input-field"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Attach Official Document (PDF - Encrypted off-chain via AES-256)</label>
                <input
                  id="doc-file-input"
                  type="file"
                  accept="application/pdf"
                  className="input-field"
                  onChange={handleFileChange}
                  style={{ padding: '0.6rem' }}
                />
              </div>
            </div>

            <button type="submit" disabled={issuing} className="btn-primary" style={{ marginTop: '1.5rem', width: '100%' }}>
              {issuing ? (
                <>
                  <div className="spinner"></div> Encrypting & Anchoring on Blockchain...
                </>
              ) : (
                '🔐 Issue & Send Signed Credential'
              )}
            </button>
          </form>
        </div>
      ) : (
        <div>
          {loadingList ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner"></div>
            </div>
          ) : issuedList.length === 0 ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
              <span style={{ fontSize: '3rem' }}>📋</span>
              <h3 style={{ marginTop: '1rem' }}>No Issued Credentials</h3>
              <p style={{ margin: 0 }}>You have not issued any digital credentials using this wallet address.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
            }}>
              {issuedList.map((c) => (
                <CredentialCard
                  key={c.id}
                  credential={c}
                  userRole="issuer"
                  onRevoke={handleRevokeTrigger}
                  onDownload={downloadEncryptedFile}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revocation Modal */}
      {showRevokeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="glass fade-in" style={{ padding: '2rem', maxWidth: '500px', width: '100%', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <h3 style={{ color: '#fca5a5' }}>🚫 Revoke Credential</h3>
            <p>Are you sure you want to revoke this credential? This write action is immutable on the blockchain.</p>
            
            <div className="form-group" style={{ margin: '1.5rem 0' }}>
              <label>Reason for Revocation</label>
              <input
                type="text"
                required
                placeholder="e.g. Student graduated / Expelled / Account closed"
                className="input-field"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRevokeModal(false)} className="btn-glass">
                Cancel
              </button>
              <button onClick={handleConfirmRevoke} disabled={revoking || !revokeReason} className="btn-danger">
                {revoking ? 'Revoking on-chain...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
