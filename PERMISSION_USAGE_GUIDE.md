# Permission System Usage Guide

## Overview
This guide demonstrates how to use the Ruang Performer permission system (RBAC) in both frontend and backend code.

## Table of Contents
1. [Frontend Usage](#frontend-usage)
2. [Backend Usage](#backend-usage)
3. [Component Examples](#component-examples)
4. [API Examples](#api-examples)
5. [Testing Examples](#testing-examples)

---

## Frontend Usage

### 1. Using the usePermission Hook

The `usePermission` hook is the primary way to check permissions in React components.

#### Basic Permission Check
```jsx
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';

function SongActions({ bandId, userRole }) {
  const { can, isOwner } = usePermission(bandId, { 
    userId: user.id, 
    role: userRole 
  });

  return (
    <div>
      {can(PERMISSIONS.SONG_CREATE) && (
        <button>Create Song</button>
      )}
      
      {can(PERMISSIONS.SONG_EDIT) && (
        <button>Edit Song</button>
      )}
      
      {isOwner() && (
        <button className="danger">Delete Song</button>
      )}
    </div>
  );
}
```

#### Multiple Permission Checks
```jsx
// Check if user has ALL permissions
const { canAll } = usePermission(bandId, userInfo);

if (canAll([PERMISSIONS.SONG_EDIT, PERMISSIONS.SONG_DELETE])) {
  // User can both edit and delete
}

// Check if user has ANY permission
const { canAny } = usePermission(bandId, userInfo);

if (canAny([PERMISSIONS.MEMBER_INVITE, PERMISSIONS.MEMBER_MANAGE_ROLES])) {
  // User can manage members in some way
}
```

#### Admin/Owner Checks
```jsx
const { isOwner, isAdmin } = usePermission(bandId, userInfo);

return (
  <>
    {isOwner() && <AdminPanel />}
    {isAdmin() && <ManageContentPanel />}
    {!isOwner() && !isAdmin() && <ViewOnlyPanel />}
  </>
);
```

#### Getting User Role
```jsx
const { getRole, getUser } = usePermission(bandId, userInfo);

const userRole = getRole(); // Returns: 'owner' | 'admin' | 'member'
const userData = getUser(); // Returns: { userId, role, ... }

console.log(`User ${userData.userId} has role: ${userRole}`);
```

### 2. Using PermissionGate Component

The `PermissionGate` component conditionally renders content based on permissions.

#### Basic Usage
```jsx
import { PermissionGate } from '../hooks/usePermission.js';

function BandSettings() {
  return (
    <>
      <h1>Band Settings</h1>
      
      <PermissionGate 
        permission={PERMISSIONS.BAND_EDIT}
        userRole={userRole}
      >
        <button>Edit Band Name</button>
        <input type="text" placeholder="Band Name" />
      </PermissionGate>
    </>
  );
}
```

#### With Fallback UI
```jsx
<PermissionGate 
  permission={PERMISSIONS.MEMBER_MANAGE_ROLES}
  userRole={userRole}
  fallback={
    <p>
      You don't have permission to manage member roles. 
      Only band owners and admins can do this.
    </p>
  }
>
  <AdminPanel />
</PermissionGate>
```

### 3. Conditional Styling

```jsx
function MemberListItem({ member, bandId, userRole }) {
  const { can, isOwner } = usePermission(bandId, { role: userRole });
  const canManage = can(PERMISSIONS.MEMBER_MANAGE_ROLES);

  return (
    <div className={canManage ? 'manageable' : 'readonly'}>
      <h3>{member.username}</h3>
      <p>{member.email}</p>
      
      {canManage && (
        <select defaultValue={member.role}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      )}
    </div>
  );
}
```

---

## Backend Usage

### 1. Using Permission Middleware in Express Routes

The permission middleware checks permissions at the API level before executing handlers.

#### Basic Permission Middleware
```javascript
import { requirePermission, requireOwner, requireAdmin } from '../api/permissions.js';
import { PERMISSIONS } from '../src/utils/permissionUtils.js';

// Require specific permission
app.post('/api/bands/:id/songs', 
  verifyToken,
  requirePermission(PERMISSIONS.SONG_CREATE),
  async (req, res) => {
    // Handler code - only executed if user has SONG_CREATE permission
    const song = await createSong(req.body);
    res.json(song);
  }
);

// Require owner access
app.delete('/api/bands/:id', 
  verifyToken,
  requireOwner(),
  async (req, res) => {
    // Only band owner can delete
    await deleteBand(req.params.id);
    res.json({ success: true });
  }
);

// Require admin or owner
app.post('/api/bands/:id/invitations', 
  verifyToken,
  requireAdmin(),
  async (req, res) => {
    // Only admin or owner can invite
    const invitation = await sendInvitation(req.body);
    res.json(invitation);
  }
);
```

#### Access User Role in Handler
After middleware executes, `req.userRole` and `req.isOwner` are attached:

```javascript
app.put('/api/bands/:id', 
  verifyToken,
  requirePermission(PERMISSIONS.BAND_EDIT),
  async (req, res) => {
    // Handler can access user's role
    const band = {
      ...req.body,
      updatedBy: req.user.userId,
      updatedByRole: req.userRole
    };
    
    await updateBand(req.params.id, band);
    res.json(band);
  }
);
```

### 2. Manual Permission Checking in Handlers

If you don't want to use middleware, check permissions manually:

```javascript
import { hasPermission, PERMISSIONS } from '../src/utils/permissionUtils.js';

app.post('/api/bands/:id/songs', verifyToken, async (req, res) => {
  const userRole = await getUserRoleInBand(req.user.userId, req.params.id);
  
  if (!hasPermission(userRole, PERMISSIONS.SONG_CREATE)) {
    return res.status(403).json({ 
      error: 'You do not have permission to create songs'
    });
  }
  
  const song = await createSong(req.body);
  res.json(song);
});
```

### 3. Getting All Permissions for a Role

```javascript
import { getPermissionsForRole } from '../src/utils/permissionUtils.js';

// Get all permissions for a role
const memberPermissions = getPermissionsForRole('member');
console.log(memberPermissions);
// Output: ['SONG_CREATE', 'SONG_VIEW', 'SETLIST_VIEW', ...]

const adminPermissions = getPermissionsForRole('admin');
const ownerPermissions = getPermissionsForRole('owner');
```

### 4. Checking Multiple Permissions

```javascript
import { hasAllPermissions, hasAnyPermission } from '../src/utils/permissionUtils.js';

// Check if user has ALL specified permissions
if (hasAllPermissions('admin', [PERMISSIONS.SONG_EDIT, PERMISSIONS.SONG_DELETE])) {
  // User can both edit and delete songs
}

// Check if user has ANY of the specified permissions
if (hasAnyPermission('member', [PERMISSIONS.SONG_CREATE, PERMISSIONS.SONG_EDIT])) {
  // User can either create or edit songs
}
```

---

## Component Examples

### Complete Admin Panel Example
```jsx
import React, { useState, useEffect } from 'react';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';
import * as apiClient from '../apiClient.js';

export function AdminPanel({ bandId, userRole }) {
  const [members, setMembers] = useState([]);
  const { can, isOwner } = usePermission(bandId, { role: userRole });

  useEffect(() => {
    // Only fetch if user has permission
    if (can(PERMISSIONS.MEMBER_MANAGE_ROLES)) {
      apiClient.getBandMembers(bandId).then(setMembers);
    }
  }, [bandId, can]);

  const handleRoleChange = (memberId, newRole) => {
    if (!isOwner()) {
      alert('Only owners can change roles');
      return;
    }
    
    apiClient.updateMemberRole(bandId, memberId, newRole);
  };

  const handleRemoveMember = (memberId) => {
    if (!isOwner()) {
      alert('Only owners can remove members');
      return;
    }
    
    if (window.confirm('Remove this member?')) {
      apiClient.removeBandMember(bandId, memberId);
    }
  };

  // Show access denied if no permission
  if (!can(PERMISSIONS.MEMBER_MANAGE_ROLES)) {
    return <p>You don't have permission to manage roles.</p>;
  }

  return (
    <div className="admin-panel">
      <h2>Band Members</h2>
      
      {members.map(member => (
        <div key={member.userId} className="member">
          <span>{member.username}</span>
          
          <select 
            value={member.role}
            onChange={(e) => handleRoleChange(member.userId, e.target.value)}
            disabled={!isOwner()}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          
          {isOwner() && (
            <button onClick={() => handleRemoveMember(member.userId)}>
              Remove
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Song Management Component
```jsx
export function SongManager({ songId, bandId, userRole, userId }) {
  const { can, getUser } = usePermission(bandId, { role: userRole, userId });
  const userInfo = getUser();

  return (
    <div className="song-manager">
      {can(PERMISSIONS.SONG_EDIT) && (
        <button className="btn-edit">Edit</button>
      )}
      
      {can(PERMISSIONS.SONG_DELETE) && (
        <button className="btn-delete">Delete</button>
      )}
      
      {/* Show warning if trying to edit someone else's song as member */}
      {userRole === 'member' && userId !== song.createdBy && (
        <p className="warning">You can only edit your own songs</p>
      )}
    </div>
  );
}
```

---

## API Examples

### Frontend: Fetching Protected Resources
```javascript
// apiClient.js already includes auth header automatically

// Get band members (requires MEMBER_INVITE or MEMBER_MANAGE_ROLES)
const members = await apiClient.getBandMembers(bandId);

// Update member role (requires MEMBER_MANAGE_ROLES, only owner)
await apiClient.updateMemberRole(bandId, memberId, 'admin');

// Remove member (requires MEMBER_REMOVE, only owner)
await apiClient.removeBandMember(bandId, memberId);
```

### Error Handling
```javascript
try {
  await apiClient.updateMemberRole(bandId, memberId, 'admin');
} catch (error) {
  if (error.message.includes('403')) {
    console.error('You don\'t have permission to change roles');
  } else if (error.message.includes('Only owner')) {
    console.error('Only band owners can change roles');
  }
}
```

---

## Testing Examples

### Unit Test: Permission Checking
```javascript
import { hasPermission, getPermissionsForRole } from '../src/utils/permissionUtils.js';

describe('Permission Utils', () => {
  test('owner has all permissions', () => {
    const ownerPermissions = getPermissionsForRole('owner');
    expect(ownerPermissions.length).toBe(18);
  });

  test('member has limited permissions', () => {
    const memberPermissions = getPermissionsForRole('member');
    expect(memberPermissions.length).toBeLessThan(18);
    expect(hasPermission('member', 'BAND_DELETE')).toBe(false);
  });

  test('admin cannot delete band', () => {
    expect(hasPermission('admin', 'BAND_DELETE')).toBe(false);
  });
});
```

### Integration Test: API Endpoint
```javascript
import request from 'supertest';
import app from '../api/index.js';

describe('Member Management API', () => {
  test('owner can change member role', async () => {
    const response = await request(app)
      .patch('/api/bands/123/members/456')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'admin' });
    
    expect(response.status).toBe(200);
    expect(response.body.role).toBe('admin');
  });

  test('member cannot change roles', async () => {
    const response = await request(app)
      .patch('/api/bands/123/members/456')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ role: 'admin' });
    
    expect(response.status).toBe(403);
  });

  test('non-member cannot access band', async () => {
    const response = await request(app)
      .get('/api/bands/123/members')
      .set('Authorization', `Bearer ${outsiderToken}`);
    
    expect(response.status).toBe(403);
  });
});
```

---

## Permission Matrix

| Permission | Owner | Admin | Member |
|-----------|-------|-------|--------|
| BAND_VIEW | ✅ | ✅ | ✅ |
| BAND_CREATE | ✅ | ❌ | ❌ |
| BAND_EDIT | ✅ | ✅ | ❌ |
| BAND_DELETE | ✅ | ❌ | ❌ |
| MEMBER_INVITE | ✅ | ✅ | ❌ |
| MEMBER_MANAGE_ROLES | ✅ | ❌ | ❌ |
| MEMBER_REMOVE | ✅ | ❌ | ❌ |
| SONG_CREATE | ✅ | ✅ | ✅* |
| SONG_VIEW | ✅ | ✅ | ✅ |
| SONG_EDIT | ✅ | ✅ | ✅* |
| SONG_DELETE | ✅ | ✅ | ✅* |
| SETLIST_CREATE | ✅ | ✅ | ❌ |
| SETLIST_EDIT | ✅ | ✅ | ❌ |
| SETLIST_DELETE | ✅ | ✅ | ❌ |

*Member can only edit/delete their own songs

---

## Best Practices

### 1. Always Check Permissions in Frontend
```jsx
// ✅ Good: Check before showing UI
{can(PERMISSIONS.BAND_DELETE) && <DeleteButton />}

// ❌ Avoid: Hiding button but handler still vulnerable
<DeleteButton style={{display: can(...) ? 'block' : 'none'}} />
```

### 2. Always Verify in Backend
```javascript
// ✅ Good: Middleware verifies permission
app.delete('/api/bands/:id', requireOwner(), handler);

// ❌ Avoid: Relying only on frontend validation
app.delete('/api/bands/:id', handler); // No middleware!
```

### 3. Use Appropriate Middleware
```javascript
// ✅ Good: Use most restrictive middleware needed
app.post('/api/bands/:id/songs', requirePermission(PERMISSIONS.SONG_CREATE));

// ❌ Avoid: Using permissive middleware
app.post('/api/bands/:id/songs', loadUserRole(), handler);
```

### 4. Clear Error Messages
```jsx
// ✅ Good: Explain what's needed
<PermissionGate 
  permission={PERMISSIONS.MEMBER_INVITE}
  fallback={<p>Only admins and owners can invite members</p>}
>
  <InviteForm />
</PermissionGate>

// ❌ Avoid: Vague messages
<PermissionGate permission={PERMISSIONS.MEMBER_INVITE} fallback="Access denied" />
```

### 5. Audit Sensitive Operations
```javascript
// When making permission changes, log them
app.patch('/api/bands/:id/members/:userId', 
  requireOwner(),
  async (req, res) => {
    logAudit({
      action: 'ROLE_CHANGED',
      bandId: req.params.id,
      targetUser: req.params.userId,
      newRole: req.body.role,
      changedBy: req.user.userId
    });
    // ... rest of handler
  }
);
```

---

## Common Issues & Solutions

### Issue: User sees "Access Denied" but should have permission
```javascript
// Solution: Verify role is correctly set in database
SELECT userId, role FROM band_members WHERE bandId = ? AND userId = ?

// Check if user is owner
SELECT createdBy FROM bands WHERE id = ?
```

### Issue: Permission check in usePermission always returns false
```javascript
// Solution: Ensure you're passing correct userRole
const { can } = usePermission(bandId, { 
  role: userRole  // Make sure this matches 'owner', 'admin', or 'member'
});

// Verify the role value
console.log('User role:', userRole); // Should be lowercase
```

### Issue: API returns 403 but frontend check passed
```javascript
// Solution: Middleware check is stricter than frontend
// Ensure userRole loaded from database matches frontend
// Frontend might be out of sync if role recently changed

// Solution: Refresh user data before making request
const userInfo = await apiClient.getCurrentUser();
await apiClient.updateMemberRole(bandId, userId, newRole);
```

---

**For more information, see:**
- [PERMISSIONS.md](PERMISSIONS.md) - Permission definitions
- [PHASE_3_COMPLETE.md](PHASE_3_COMPLETE.md) - Implementation details
- Source code in `src/utils/permissionUtils.js` and `api/permissions.js`
