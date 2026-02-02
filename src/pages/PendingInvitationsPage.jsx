import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';
import { updatePageMeta } from '../utils/metaTagsUtil.js';

export default function PendingInvitationsPage() {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    updatePageMeta({
      title: 'Pending Invitations | PerformerHub',
      description: 'View and manage band invitations'
    });
    fetchPendingInvitations();
  }, []);

  const fetchPendingInvitations = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPendingInvitations();
      setInvitations(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      await apiClient.acceptInvitation(invitationId);
      setInvitations(invitations.filter(i => i.id !== invitationId));
      // Navigate to the band
      const invitation = invitations.find(i => i.id === invitationId);
      if (invitation) {
        navigate(`/bands/${invitation.bandId}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      await apiClient.rejectInvitation(invitationId);
      setInvitations(invitations.filter(i => i.id !== invitationId));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>📨 Undangan Band</h1>
        </div>
        <div className="loading-container">Memuat undangan...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📨 Undangan Band</h1>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="not-found-container" style={{
          background: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <p className="not-found-title">Belum ada undangan</p>
          <p className="not-found-message">Ketika ada yang mengundang kamu bergabung dengan band, undangan akan muncul di sini</p>
        </div>
      ) : (
        <div className="grid-gap">
          {invitations.map(invitation => (
            <div
              key={invitation.id}
              className="invitation-card"
            >
              <div className="invitation-header">
                <div className="invitation-info">
                  <h3 className="invitation-title">
                    🎸 {invitation.bandName || 'Unknown Band'}
                  </h3>
                  <div className="invitation-meta">
                    Diundang oleh <strong>{invitation.invitedByName || 'Someone'}</strong> sebagai <strong>{invitation.role}</strong>
                  </div>
                  <div className="invitation-date">
                    Diterima: {new Date(invitation.createdAt).toLocaleDateString('id-ID')} | 
                    Expired: {new Date(invitation.expiresAt).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="invitation-actions">
                <button
                  className="btn-base btn-accept"
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processingId === invitation.id}
                >
                  {processingId === invitation.id ? '⏳ Processing...' : '✓ Accept'}
                </button>
                <button
                  className="btn-base btn-reject"
                  onClick={() => handleReject(invitation.id)}
                  disabled={processingId === invitation.id}
                >
                  {processingId === invitation.id ? '⏳ Processing...' : '✕ Decline'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
