import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { setup2FA, verify2FA } from '../apiClient';

export default function TwoFactorSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState('loading'); // loading, display, verify, success
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationToken, setVerificationToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    const fetchSetupData = async () => {
      try {
        setLoading(true);
        const data = await setup2FA();
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setBackupCodes(data.backupCodes);
        setStep('display');
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to initialize 2FA setup. Please try again.');
        setStep('error');
      } finally {
        setLoading(false);
      }
    };

    fetchSetupData();
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!verificationToken.trim()) {
      setError('Please enter the 6-digit code from your authenticator app');
      return;
    }

    if (!/^\d{6}$/.test(verificationToken.trim())) {
      setError('Code must be exactly 6 digits');
      return;
    }

    try {
      setVerifying(true);
      setError('');
      
      // Basic format validation on client side
      if (!/^\d{6}$/.test(verificationToken.trim())) {
        setError('Code must be exactly 6 digits');
        return;
      }

      // Server will do the actual TOTP verification
      await verify2FA(secret, verificationToken.trim(), backupCodes);
      setSuccess(true);
      setStep('success');
      
      // Redirect after success message
      setTimeout(() => {
        navigate('/settings');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to enable 2FA. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const copyBackupCode = async (code, index) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(index);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy backup code:', err);
    }
  };

  if (!user) {
    return (
      <div className="page-container">
        <p className="error-message">Please log in to set up two-factor authentication.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Setting up Two-Factor Authentication</h1>
        </div>
        <div className="card setup-card">
          <p>Loading setup data...</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Two-Factor Authentication Enabled</h1>
        </div>
        <div className="card setup-card">
          <div className="success-icon">✓</div>
          <h2 className="success-title">
            Success!
          </h2>
          <p className="success-message">
            Two-factor authentication has been successfully enabled on your account.
          </p>
          <p className="secondary-text">
            Redirecting to settings in 3 seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Set Up Two-Factor Authentication</h1>
        <p className="secondary-text setup-header-subtitle">
          Enhance your account security with two-factor authentication
        </p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="setup-grid">
        {/* QR Code Section */}
        <div className="card">
          <h3 className="setup-step-title">Step 1: Scan QR Code</h3>
          <p className="setup-step-text">
            Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator to scan this QR code:
          </p>
          {qrCode && (
            <div className="qr-container">
              <img 
                src={qrCode} 
                alt="2FA QR Code" 
                className="qr-image"
              />
            </div>
          )}
          <p className="setup-step-text setup-step-text-small">
            Or enter this code manually if the QR code doesn't work:
          </p>
          <div className="manual-code">
            {secret}
          </div>
        </div>

        {/* Verification Section */}
        <div className="card">
          <h3 className="setup-step-title">Step 2: Verify Code</h3>
          <p className="setup-step-text">
            Enter the 6-digit code from your authenticator app to confirm the setup:
          </p>
          <form onSubmit={handleVerify}>
            <div className="setup-form-group">
              <input
                type="text"
                className="modal-input token-input"
                placeholder="000000"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
                pattern="\d{6}"
                autoComplete="off"
                disabled={verifying}
              />
            </div>
            <button
              type="submit"
              className="btn setup-submit-btn"
              disabled={verifying || !verificationToken || verificationToken.length !== 6}
            >
              {verifying ? 'Verifying...' : 'Verify & Enable 2FA'}
            </button>
          </form>
        </div>
      </div>

      {/* Backup Codes Section */}
      <div className="card setup-card-spaced">
        <div className="backup-header-row">
          <h3>Step 3: Save Backup Codes</h3>
          <button
            onClick={() => setShowBackupCodes(!showBackupCodes)}
            className="backup-toggle-btn"
          >
            {showBackupCodes ? 'Hide' : 'Show'} Backup Codes
          </button>
        </div>
        <p className="backup-help-text">
          Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator app:
        </p>
        
        {showBackupCodes && (
          <div className="backup-code-grid">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                onClick={() => copyBackupCode(code, index)}
                className={`backup-code-item ${copiedCode === index ? 'copied' : ''}`}
                title="Click to copy"
              >
                {copiedCode === index ? '✓ Copied!' : code}
              </div>
            ))}
          </div>
        )}
        
        <div className="backup-warning-box">
          <strong>⚠️ Important:</strong> Store these codes securely. Each code can only be used once and cannot be recovered if lost.
        </div>
      </div>

      {/* Info Box */}
      <div className="card info-card">
        <h4 className="info-title">About Two-Factor Authentication</h4>
        <ul className="info-list">
          <li>You'll need your authenticator app to sign in to your account</li>
          <li>Backup codes can be used if you lose access to your authenticator app</li>
          <li>Each backup code can only be used once</li>
          <li>You can disable 2FA anytime from your account settings</li>
        </ul>
      </div>
    </div>
  );
}
