import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient';
import '../App.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Validate token and email
    if (!token || !email) {
      setError('Invalid reset link');
    }
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          newPassword: password
        })
      }).then(async res => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to reset password');
        }
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      });
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">
            Invalid Link
          </h1>
          <p className="auth-subtitle">
            This password reset link is invalid or has expired.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="btn-base full-width-btn"
            style={{ background: 'var(--primary-color)', color: 'white' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card setup-card">
          <div className="success-icon">✅</div>
          <h1 className="auth-title">
            Password Reset Successful
          </h1>
          <p className="auth-subtitle">
            Your password has been reset. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container" style={{ padding: '20px' }}>
      <div className="auth-card">
        <h1 className="auth-title">
          Reset Password
        </h1>
        <p className="auth-subtitle" style={{ marginBottom: '30px' }}>
          Enter your new password below
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="form-label-required">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="modal-input full-width-btn"
              disabled={loading}
            />
          </div>

          <div>
            <label className="form-label-required">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="modal-input full-width-btn"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-base full-width-btn"
            style={{
              background: 'var(--primary-color)',
              color: 'white',
              padding: '12px',
              fontWeight: '600',
              marginTop: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
            disabled={loading}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <p style={{ 
          textAlign: 'center', 
          color: 'var(--text-secondary)', 
          fontSize: '0.9em',
          marginTop: '20px'
        }}>
          Remember your password? <a href="/login" style={{ color: 'var(--primary-color)' }}>Back to login</a>
        </p>
      </div>
    </div>
  );
}
