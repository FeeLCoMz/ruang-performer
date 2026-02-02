import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as apiClient from '../apiClient.js';

export default function InvitationPage() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchInvitation();
  }, [invitationId]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getInvitation(invitationId);
      setInvitation(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setProcessing(true);
      await apiClient.acceptInvitation(invitationId);
      navigate('/bands', { replace: true });
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    try {
      setProcessing(true);
      await apiClient.rejectInvitation(invitationId);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <h2>Loading invitation...</h2>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="page-container">
        <div className="not-found-container">
          <h2>❌ Invitation Error</h2>
          <p>{error || 'Invitation not found'}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (invitation.status !== 'pending') {
    return (
      <div className="page-container">
        <div className="not-found-container">
          <h2>Invitation {invitation.status}</h2>
          <p>This invitation has already been {invitation.status}.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="card setup-card">
        <h1>🎉 You're Invited!</h1>
        <p className="setup-step-text" style={{ fontSize: '18px', marginTop: '20px' }}>
          You've been invited to join a band as a <strong>{invitation.role}</strong>
        </p>
        
        <div className="invitation-card" style={{ margin: '30px 0', textAlign: 'left' }}>
          <p><strong>Email:</strong> {invitation.email}</p>
          <p><strong>Role:</strong> {invitation.role}</p>
          <p><strong>Sent:</strong> {new Date(invitation.createdAt).toLocaleDateString()}</p>
          <p><strong>Expires:</strong> {new Date(invitation.expiresAt).toLocaleDateString()}</p>
        </div>

        <div className="invitation-actions" style={{ justifyContent: 'center', marginTop: '30px' }}>
          <button
            className="btn-primary btn-accept"
            onClick={handleAccept}
            disabled={processing}
            style={{ flex: 1 }}
          >
            {processing ? 'Processing...' : '✅ Accept'}
          </button>
          <button
            className="btn-secondary btn-reject"
            onClick={handleReject}
            disabled={processing}
            style={{ flex: 1 }}
          >
            {processing ? 'Processing...' : '❌ Decline'}
          </button>
        </div>
      </div>
    </div>
  );
}
