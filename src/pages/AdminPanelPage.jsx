import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as apiClient from '../apiClient';
import { usePermission } from '../hooks/usePermission';
import { PERMISSIONS } from '../utils/permissionUtils';
import SongControls from '../components/SongControls';
import '../styles/AdminPanel.css';

export default function AdminPanelPage() {
  const { bandId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Create user band info for permission checking
  const userBandInfo = {
    userId: user?.userId,
    role: 'member' // Will be loaded from API
  };
  
  const { can, isOwner } = usePermission(bandId, userBandInfo);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [newRole, setNewRole] = useState('member');

  useEffect(() => {
    if (!bandId) return;
    fetchMembers();
  }, [bandId]);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getBandMembers(bandId);
      setMembers(data || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [bandId]);

  const handleRoleChange = async (memberId, role) => {
    try {
      setError(null);
      await apiClient.updateMemberRole(bandId, memberId, role);
      setMembers(
        members.map((m) =>
          m.userId === memberId ? { ...m, role } : m
        )
      );
      setEditingMemberId(null);
    } catch (err) {
      console.error('Failed to update role:', err);
      setError(err.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      setError(null);
      await apiClient.removeBandMember(bandId, memberId);
      setMembers(members.filter((m) => m.userId !== memberId));
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError(err.message || 'Failed to remove member');
    }
  };

  if (!can(PERMISSIONS.MEMBER_MANAGE_ROLES)) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Access Denied</h1>
        </div>
        <div className="card">
          <p>You don't have permission to manage roles for this band.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Band Admin Panel</h1>
        <SongControls
          onClose={() => navigate(`/bands/${bandId}`)}
          showSaveButton={false}
          showDeleteButton={false}
        />
      </div>

      {error && (
        <div className="card card-error">
          <p>{error}</p>
        </div>
      )}

      <div className="card">
        <h2>Members & Roles</h2>
        {loading ? (
          <p>Loading members...</p>
        ) : members.length === 0 ? (
          <p>No members yet.</p>
        ) : (
          <div className="members-list">
            {members.map((member) => (
              <div key={member.userId} className="member-item">
                <div className="member-info">
                  <p className="member-name">
                    {member.username}
                    {member.isOwner && <span className="badge badge-owner">Owner</span>}
                  </p>
                  <p className="member-email">{member.email}</p>
                </div>

                <div className="member-actions">
                  {!member.isOwner && (
                    <>
                      {editingMemberId === member.userId ? (
                        <div className="role-editor">
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="role-select"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() =>
                              handleRoleChange(member.userId, newRole)
                            }
                            className="btn-save"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMemberId(null)}
                            className="btn-cancel"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className={`role-badge role-${member.role}`}>
                            {member.role.charAt(0).toUpperCase() +
                              member.role.slice(1)}
                          </span>
                          {isOwner && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMemberId(member.userId);
                                  setNewRole(member.role);
                                }}
                                className="btn-edit"
                              >
                                Change Role
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                className="btn-remove"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Role Permissions</h2>
        <div className="permissions-info">
          <div className="role-section">
            <h3>Owner</h3>
            <ul>
              <li>Full control over band</li>
              <li>Manage members and roles</li>
              <li>Edit band details</li>
              <li>Delete band</li>
            </ul>
          </div>

          <div className="role-section">
            <h3>Admin</h3>
            <ul>
              <li>Manage songs and setlists</li>
              <li>Invite members</li>
              <li>Edit band details</li>
              <li>Cannot delete band or remove owner</li>
            </ul>
          </div>

          <div className="role-section">
            <h3>Member</h3>
            <ul>
              <li>View band content</li>
              <li>Create and edit own contributions</li>
              <li>Cannot modify other members' content</li>
              <li>Cannot manage band</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
