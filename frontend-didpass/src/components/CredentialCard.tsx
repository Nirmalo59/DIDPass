import React from 'react';
import { truncateAddress } from '../utils/metamask';

export interface CredentialType {
  id: string;
  credentialHash: string;
  holderAddress: string;
  holderName: string;
  holderEmail?: string;
  issuerAddress: string;
  issuer: {
    name: string;
    logoEmoji: string;
  };
  credentialType: string;
  documentHash?: string;
  ipfsCid?: string;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  issuedAt: string;
  expiresAt?: string;
  metadata?: string;
}

interface CredentialCardProps {
  credential: CredentialType;
  onRevoke?: (hash: string) => void;
  onShowQR?: (hash: string) => void;
  onDownload?: (hash: string) => void;
  userRole?: string;
}

export const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onRevoke,
  onShowQR,
  onDownload,
  userRole,
}) => {
  const metaObj = credential.metadata ? JSON.parse(credential.metadata) : {};
  const isExpired = credential.expiresAt ? new Date(credential.expiresAt) < new Date() : false;

  const getStatusBadge = () => {
    if (credential.status === 'REVOKED') return <span className="badge badge-danger">Revoked</span>;
    if (isExpired || credential.status === 'EXPIRED') return <span className="badge badge-danger">Expired</span>;
    if (credential.status === 'PENDING') return <span className="badge badge-warning">Pending Claim</span>;
    return <span className="badge badge-success">Active</span>;
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'student_id': return 'Student ID Credential';
      case 'bank_kyc': return 'Bank KYC Credential';
      default: return 'Identity Credential';
    }
  };

  return (
    <div className="glass fade-in" style={{
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: '260px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow overlay */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: credential.credentialType === 'student_id' ? 'var(--accent-purple)' : 'var(--accent-cyan)',
        filter: 'blur(40px)',
        opacity: 0.15,
        pointerEvents: 'none',
      }}></div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{credential.issuer.logoEmoji || '🏛️'}</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{credential.issuer.name}</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Issuer: {truncateAddress(credential.issuerAddress)}
              </span>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <div style={{ margin: '1rem 0' }}>
          <span style={{
            fontSize: '0.8rem',
            color: credential.credentialType === 'student_id' ? '#c084fc' : '#22d3ee',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'block',
            marginBottom: '0.25rem',
          }}>
            {getTypeName(credential.credentialType)}
          </span>
          <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
            {credential.holderName}
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div>
              <strong>Wallet:</strong> {truncateAddress(credential.holderAddress)}
            </div>
            {metaObj.studentId && (
              <div>
                <strong>ID:</strong> {metaObj.studentId}
              </div>
            )}
            {metaObj.course && (
              <div>
                <strong>Course:</strong> {metaObj.course}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          <div>
            Issued: {new Date(credential.issuedAt).toLocaleDateString()}
          </div>
          {credential.expiresAt && (
            <div>
              Expires: {new Date(credential.expiresAt).toLocaleDateString()}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onShowQR && (
            <button onClick={() => onShowQR(credential.credentialHash)} className="btn-glass" style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', flex: 1 }}>
              🔍 View QR
            </button>
          )}

          {credential.documentHash && onDownload && credential.status === 'ACTIVE' && (
            <button onClick={() => onDownload(credential.documentHash!)} className="btn-glass" style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', flex: 1, color: '#a5f3fc', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
              📄 Download Doc
            </button>
          )}

          {onRevoke && userRole === 'issuer' && credential.status !== 'REVOKED' && (
            <button onClick={() => onRevoke(credential.credentialHash)} className="btn-danger" style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
              Revoke
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
