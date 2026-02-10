# Ruang Performer - User Permissions & Authorization System

## 🔐 Recommended Permission Architecture

### User Roles Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                  SUPER ADMIN                        │
│  (Platform Owner - Full System Access)              │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────┐
│                  BAND OWNER                         │
│  (Band Leader - Full Band Control)                  │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼──────┐    ┌────────▼────────┐
│   BAND ADMIN │    │  BAND MEMBER    │
│(Co-Manager)  │    │(Musician)       │
└──────────────┘    └─────────────────┘
```

---

## 📋 Role Definitions

### 1. **SUPER ADMIN** 👑
**Access Level:** Full system access

**Permissions:**
- ✅ Manage all users (create, edit, delete, ban)
- ✅ Manage all bands
- ✅ Access all data across platform
- ✅ View analytics dashboard
- ✅ Manage system settings
- ✅ View audit logs
- ✅ Restore deleted data

**Use Case:** Platform administrator, support team

---

### 2. **BAND OWNER** 🎸
**Access Level:** Full control over own band

**Permissions:**
- ✅ Create/edit/delete band
- ✅ Manage band members (invite, remove, set roles)
- ✅ Create/edit/delete songs
- ✅ Create/edit/delete setlists
- ✅ Schedule practice sessions
- ✅ Schedule gigs
- ✅ View band analytics
- ✅ Export band data
- ✅ Change band settings
- ✅ Delete band (only if no active events)

**Cannot:**
- ❌ Access other bands
- ❌ Change member to owner
- ❌ Delete songs used in active setlists

**Use Case:** Band leader, manager

---

### 3. **BAND ADMIN** (Co-Manager) 🎼
**Access Level:** Manage band operations (except member management)

**Permissions:**
- ✅ Create/edit/delete songs
- ✅ Create/edit/delete setlists
- ✅ Schedule practice sessions
- ✅ Schedule gigs
- ✅ View band analytics
- ✅ Edit band info
- ✅ Add/remove members to/from events
- ✅ Export setlists/songs

**Cannot:**
- ❌ Manage member roles
- ❌ Remove members from band
- ❌ Delete band
- ❌ Change band owner
- ❌ Access financial data

**Use Case:** Assistant manager, booking coordinator

---

### 4. **BAND MEMBER** 🎵
**Access Level:** View & participate in band activities

**Permissions:**
- ✅ View band info
- ✅ View all songs
- ✅ View setlists
- ✅ View practice schedules
- ✅ View gig schedules
- ✅ Add notes to songs
- ✅ Save favorite setlists
- ✅ View own profile
- ✅ Edit own profile

**Cannot:**
- ❌ Create/edit/delete anything
- ❌ Remove other members
- ❌ Schedule events
- ❌ Access analytics

**Use Case:** Band musicians, guest performers

---

## 🔑 Granular Permissions Matrix

```
Permission                  | Admin | Co-Admin | Member
─────────────────────────────────────────────────────
Songs
  Create Song               |  ✅   |   ✅    |  ❌
  Edit Song                 |  ✅   |   ✅    |  ❌
  Delete Song               |  ✅   |   ✅    |  ❌
  View Songs                |  ✅   |   ✅    |  ✅
  Search Songs              |  ✅   |   ✅    |  ✅

Setlists
  Create Setlist            |  ✅   |   ✅    |  ❌
  Edit Setlist              |  ✅   |   ✅    |  ❌
  Delete Setlist            |  ✅   |   ✅    |  ❌
  View Setlists             |  ✅   |   ✅    |  ✅
  Reorder Songs in Setlist  |  ✅   |   ✅    |  ❌

Practice
  Schedule Session          |  ✅   |   ✅    |  ❌
  Edit Session              |  ✅   |   ✅    |  ❌
  Cancel Session            |  ✅   |   ✅    |  ❌
  View Sessions             |  ✅   |   ✅    |  ✅
  RSVP to Session           |  ✅   |   ✅    |  ✅

Gigs
  Schedule Gig              |  ✅   |   ✅    |  ❌
  Edit Gig                  |  ✅   |   ✅    |  ❌
  Cancel Gig                |  ✅   |   ✅    |  ❌
  View Gigs                 |  ✅   |   ✅    |  ✅
  RSVP to Gig               |  ✅   |   ✅    |  ✅

Band Management
  Invite Members            |  ✅   |   ❌    |  ❌
  Remove Members            |  ✅   |   ❌    |  ❌
  Change Member Role        |  ✅   |   ❌    |  ❌
  Edit Band Info            |  ✅   |   ✅    |  ❌
  View Member List          |  ✅   |   ✅    |  ✅
  Leave Band                |  ✅   |   ✅    |  ✅

Analytics
  View Band Analytics       |  ✅   |   ✅    |  ❌
  Export Data               |  ✅   |   ✅    |  ❌
  View Attendance Report    |  ✅   |   ✅    |  ❌

Settings
  Change Band Settings      |  ✅   |   ✅    |  ❌
  Delete Band               |  ✅   |   ❌    |  ❌
  Transfer Ownership        |  ✅   |   ❌    |  ❌
```

---

## 🗂️ Implementation Structure

### Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR UNIQUE,
  password VARCHAR,
  display_name VARCHAR,
  profile_picture VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Band Members Table (Junction with roles)
CREATE TABLE band_members (
  id INTEGER PRIMARY KEY,
  band_id INTEGER,
  user_id INTEGER,
  role ENUM('owner', 'admin', 'member'),
  joined_at TIMESTAMP,
  FOREIGN KEY (band_id) REFERENCES bands(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Permissions Table
CREATE TABLE permissions (
  id INTEGER PRIMARY KEY,
  name VARCHAR UNIQUE,
  description VARCHAR,
  category VARCHAR -- 'songs', 'setlists', 'practice', 'gigs', 'band', 'analytics'
);

-- Role Permissions Junction
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY,
  role VARCHAR,
  permission_id INTEGER,
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- Audit Log
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  band_id INTEGER,
  action VARCHAR,
  resource_type VARCHAR,
  resource_id INTEGER,
  timestamp TIMESTAMP,
  details JSON,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 💻 Implementation Code Examples

### Permission Checking Utility

```javascript
// src/utils/permissionUtils.js

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BAND_OWNER: 'owner',
  BAND_ADMIN: 'admin',
  BAND_MEMBER: 'member'
};

const PERMISSIONS = {
  // Songs
  CREATE_SONG: 'create_song',
  EDIT_SONG: 'edit_song',
  DELETE_SONG: 'delete_song',
  VIEW_SONGS: 'view_songs',
  
  // Setlists
  CREATE_SETLIST: 'create_setlist',
  EDIT_SETLIST: 'edit_setlist',
  DELETE_SETLIST: 'delete_setlist',
  VIEW_SETLISTS: 'view_setlists',
  
  // Practice
  SCHEDULE_PRACTICE: 'schedule_practice',
  EDIT_PRACTICE: 'edit_practice',
  CANCEL_PRACTICE: 'cancel_practice',
  VIEW_PRACTICE: 'view_practice',
  
  // Gigs
  SCHEDULE_GIG: 'schedule_gig',
  EDIT_GIG: 'edit_gig',
  CANCEL_GIG: 'cancel_gig',
  VIEW_GIGS: 'view_gigs',
  
  // Band Management
  INVITE_MEMBERS: 'invite_members',
  REMOVE_MEMBERS: 'remove_members',
  CHANGE_MEMBER_ROLE: 'change_member_role',
  EDIT_BAND_INFO: 'edit_band_info',
  DELETE_BAND: 'delete_band',
  
  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data'
};

// Role-Permission Mapping
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  
  [ROLES.BAND_OWNER]: [
    PERMISSIONS.CREATE_SONG,
    PERMISSIONS.EDIT_SONG,
    PERMISSIONS.DELETE_SONG,
    PERMISSIONS.VIEW_SONGS,
    PERMISSIONS.CREATE_SETLIST,
    PERMISSIONS.EDIT_SETLIST,
    PERMISSIONS.DELETE_SETLIST,
    PERMISSIONS.VIEW_SETLISTS,
    PERMISSIONS.SCHEDULE_PRACTICE,
    PERMISSIONS.EDIT_PRACTICE,
    PERMISSIONS.CANCEL_PRACTICE,
    PERMISSIONS.VIEW_PRACTICE,
    PERMISSIONS.SCHEDULE_GIG,
    PERMISSIONS.EDIT_GIG,
    PERMISSIONS.CANCEL_GIG,
    PERMISSIONS.VIEW_GIGS,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.CHANGE_MEMBER_ROLE,
    PERMISSIONS.EDIT_BAND_INFO,
    PERMISSIONS.DELETE_BAND,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA
  ],
  
  [ROLES.BAND_ADMIN]: [
    PERMISSIONS.CREATE_SONG,
    PERMISSIONS.EDIT_SONG,
    PERMISSIONS.DELETE_SONG,
    PERMISSIONS.VIEW_SONGS,
    PERMISSIONS.CREATE_SETLIST,
    PERMISSIONS.EDIT_SETLIST,
    PERMISSIONS.DELETE_SETLIST,
    PERMISSIONS.VIEW_SETLISTS,
    PERMISSIONS.SCHEDULE_PRACTICE,
    PERMISSIONS.EDIT_PRACTICE,
    PERMISSIONS.CANCEL_PRACTICE,
    PERMISSIONS.VIEW_PRACTICE,
    PERMISSIONS.SCHEDULE_GIG,
    PERMISSIONS.EDIT_GIG,
    PERMISSIONS.CANCEL_GIG,
    PERMISSIONS.VIEW_GIGS,
    PERMISSIONS.EDIT_BAND_INFO,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA
  ],
  
  [ROLES.BAND_MEMBER]: [
    PERMISSIONS.VIEW_SONGS,
    PERMISSIONS.VIEW_SETLISTS,
    PERMISSIONS.VIEW_PRACTICE,
    PERMISSIONS.VIEW_GIGS
  ]
};

/**
 * Check if user has permission
 */
export function hasPermission(userRole, permission) {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Check if user can perform action on resource
 */
export function canPerformAction(userRole, action, resourceType) {
  const requiredPermission = `${action}_${resourceType}`.toLowerCase();
  return hasPermission(userRole, requiredPermission);
}

/**
 * Get all permissions for role
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user is owner or admin
 */
export function isOwnerOrAdmin(userRole) {
  return userRole === ROLES.BAND_OWNER || userRole === ROLES.BAND_ADMIN;
}

/**
 * Check if user is owner
 */
export function isOwner(userRole) {
  return userRole === ROLES.BAND_OWNER;
}
```

### Permission Check Component

```jsx
// src/components/PermissionGuard.jsx

import React from 'react';
import { hasPermission } from '../utils/permissionUtils.js';

/**
 * Component that only renders if user has required permission
 */
export default function PermissionGuard({ 
  permission, 
  userRole, 
  children, 
  fallback = null 
}) {
  if (!hasPermission(userRole, permission)) {
    return fallback;
  }
  
  return children;
}

// Usage Example:
// <PermissionGuard 
//   permission={PERMISSIONS.EDIT_SONG}
//   userRole={currentUserRole}
//   fallback={<p>You don't have permission to edit songs</p>}
// >
//   <EditSongButton />
// </PermissionGuard>
```

### Permission Check Hook

```javascript
// src/hooks/usePermission.js

import { hasPermission, getPermissionsForRole } from '../utils/permissionUtils.js';

export function usePermission(userRole) {
  return {
    can: (permission) => hasPermission(userRole, permission),
    canCreateSong: () => hasPermission(userRole, 'create_song'),
    canEditSong: () => hasPermission(userRole, 'edit_song'),
    canDeleteSong: () => hasPermission(userRole, 'delete_song'),
    canManageMembers: () => hasPermission(userRole, 'invite_members'),
    canScheduleGig: () => hasPermission(userRole, 'schedule_gig'),
    canViewAnalytics: () => hasPermission(userRole, 'view_analytics'),
    allPermissions: () => getPermissionsForRole(userRole)
  };
}

// Usage:
// const { can, canEditSong } = usePermission(userRole);
// if (canEditSong()) { /* show edit button */ }
```

### API Middleware (Backend)

```javascript
// api/middleware/authMiddleware.js

export function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const bandId = req.params.bandId || req.body.bandId;
    
    if (!userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is band member
    const isBandMember = req.user.bands?.includes(bandId);
    if (!isBandMember && userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Check permission
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    next();
  };
}

// Usage:
// router.post('/songs', requirePermission('create_song'), createSongHandler);
// router.delete('/songs/:id', requirePermission('delete_song'), deleteSongHandler);
```

---

## 🔐 Security Best Practices

### 1. **Role-Based Access Control (RBAC)**
```javascript
// Check role before allowing action
if (userRole !== 'owner' && userRole !== 'admin') {
  throw new Error('Only owner or admin can perform this action');
}
```

### 2. **Resource Ownership Verification**
```javascript
// Always verify user owns the resource
const song = await getSong(songId);
if (song.bandId !== userBandId) {
  throw new Error('Unauthorized access to resource');
}
```

### 3. **Audit Logging**
```javascript
// Log all sensitive actions
await logAuditEvent({
  userId: user.id,
  bandId: bandId,
  action: 'delete_song',
  resourceId: songId,
  timestamp: new Date()
});
```

### 4. **Rate Limiting**
```javascript
// Prevent abuse
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

### 5. **Input Validation**
```javascript
// Validate all user inputs
if (!songTitle || songTitle.length < 1 || songTitle.length > 200) {
  throw new Error('Invalid song title');
}
```

---

## 🎯 Implementation Roadmap

### Phase 1: Basic Authentication
- [ ] User registration & login
- [ ] JWT token management
- [ ] Password hashing (bcryptjs)

### Phase 2: Band Management
- [ ] Create bands
- [ ] Invite members
- [ ] Set roles (owner, admin, member)

### Phase 3: Permissions
- [ ] Implement permission checking
- [ ] Add permission guards to UI
- [ ] Backend permission middleware

### Phase 4: Advanced Features
- [ ] Audit logging
- [ ] Role management interface
- [ ] Permission analytics
- [ ] Session management

### Phase 5: Security
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration
- [ ] IP whitelisting
- [ ] Activity monitoring

---

## 📊 Permission Levels by Feature

### Songs Management
```
Owner  → ✅ Create, Edit, Delete, View
Admin  → ✅ Create, Edit, Delete, View
Member → ✅ View only
```

### Setlists Management
```
Owner  → ✅ Create, Edit, Delete, View
Admin  → ✅ Create, Edit, Delete, View
Member → ✅ View only
```

### Practice Sessions
```
Owner  → ✅ Schedule, Edit, Cancel, View
Admin  → ✅ Schedule, Edit, Cancel, View
Member → ⚠️ View & RSVP only
```

### Gigs/Concerts
```
Owner  → ✅ Schedule, Edit, Cancel, View
Admin  → ✅ Schedule, Edit, Cancel, View
Member → ⚠️ View & RSVP only
```

### Band Management
```
Owner  → ✅ Invite, Remove, Change Roles, Delete Band
Admin  → ❌ Cannot manage members
Member → ❌ Cannot manage members
```

---

## 🚀 Quick Implementation Steps

1. **Add role to users table**
   ```sql
   ALTER TABLE band_members ADD COLUMN role VARCHAR DEFAULT 'member';
   ```

2. **Create permission utilities**
   ```javascript
   // src/utils/permissionUtils.js
   // (see code above)
   ```

3. **Add permission checks to components**
   ```jsx
   <PermissionGuard permission={PERMISSIONS.EDIT_SONG} userRole={role}>
     <EditButton />
   </PermissionGuard>
   ```

4. **Add middleware to API routes**
   ```javascript
   router.post('/songs', requirePermission('create_song'), handler);
   ```

5. **Test all permission scenarios**
   ```javascript
   // Test owner can edit
   // Test admin can edit
   // Test member cannot edit
   ```

---

## 📝 Migration Checklist

- [ ] Add role column to band_members
- [ ] Create permissions table
- [ ] Create role_permissions junction table
- [ ] Create audit_logs table
- [ ] Implement permissionUtils.js
- [ ] Add PermissionGuard component
- [ ] Add usePermission hook
- [ ] Update API middleware
- [ ] Add audit logging
- [ ] Update UI to show/hide based on permissions
- [ ] Test all permission combinations
- [ ] Update documentation

---

**Last Updated:** February 2, 2026  
**Status:** Recommended Architecture Ready  
**Next Step:** Implement Phase 1 (Authentication)
