/**
 * Permission System Utilities
 * Role-based access control with granular permissions
 */

// Define all available permissions
export const PERMISSIONS = {
  // Band permissions
  BAND_CREATE: 'band:create',
  BAND_EDIT: 'band:edit',
  BAND_DELETE: 'band:delete',
  BAND_VIEW: 'band:view',
  
  // Member permissions
  MEMBER_INVITE: 'member:invite',
  MEMBER_REMOVE: 'member:remove',
  MEMBER_CHANGE_ROLE: 'member:change_role',
  MEMBER_VIEW: 'member:view',
  
  // Song permissions
  SONG_CREATE: 'song:create',
  SONG_EDIT: 'song:edit',
  SONG_DELETE: 'song:delete',
  SONG_VIEW: 'song:view',
  
  // Setlist permissions
  SETLIST_CREATE: 'setlist:create',
  SETLIST_EDIT: 'setlist:edit',
  SETLIST_DELETE: 'setlist:delete',
  SETLIST_VIEW: 'setlist:view',

  // Gig permissions
  GIG_EDIT: 'gig:edit',

  // Admin permissions
  ADMIN_MANAGE_ROLES: 'admin:manage_roles',
  ADMIN_VIEW_LOGS: 'admin:view_logs'
};

// Define roles and their permissions
export const ROLE_PERMISSIONS = {
  owner: [
    // Band management
    PERMISSIONS.BAND_CREATE,
    PERMISSIONS.BAND_EDIT,
    PERMISSIONS.BAND_DELETE,
    PERMISSIONS.BAND_VIEW,

    // Member management
    PERMISSIONS.MEMBER_INVITE,
    PERMISSIONS.MEMBER_REMOVE,
    PERMISSIONS.MEMBER_CHANGE_ROLE,
    PERMISSIONS.MEMBER_VIEW,

    // Song management
    PERMISSIONS.SONG_CREATE,
    PERMISSIONS.SONG_EDIT,
    PERMISSIONS.SONG_DELETE,
    PERMISSIONS.SONG_VIEW,

    // Setlist management
    PERMISSIONS.SETLIST_CREATE,
    PERMISSIONS.SETLIST_EDIT,
    PERMISSIONS.SETLIST_DELETE,
    PERMISSIONS.SETLIST_VIEW,

    // Gig management
    PERMISSIONS.GIG_EDIT,

    // Admin
    PERMISSIONS.ADMIN_MANAGE_ROLES,
    PERMISSIONS.ADMIN_VIEW_LOGS
  ],
  admin: [
    // Band management (no delete)
    PERMISSIONS.BAND_EDIT,
    PERMISSIONS.BAND_VIEW,

    // Member management
    PERMISSIONS.MEMBER_INVITE,
    PERMISSIONS.MEMBER_REMOVE,
    PERMISSIONS.MEMBER_CHANGE_ROLE,
    PERMISSIONS.MEMBER_VIEW,

    // Song management
    PERMISSIONS.SONG_CREATE,
    PERMISSIONS.SONG_EDIT,
    PERMISSIONS.SONG_DELETE,
    PERMISSIONS.SONG_VIEW,

    // Setlist management
    PERMISSIONS.SETLIST_CREATE,
    PERMISSIONS.SETLIST_EDIT,
    PERMISSIONS.SETLIST_DELETE,
    PERMISSIONS.SETLIST_VIEW,

    // Gig management
    PERMISSIONS.GIG_EDIT,

    // View logs
    PERMISSIONS.ADMIN_VIEW_LOGS
  ],
  member: [
    // Band viewing
    PERMISSIONS.BAND_VIEW,
    
    // Member viewing
    PERMISSIONS.MEMBER_VIEW,
    
    // Song management (limited)
    PERMISSIONS.SONG_CREATE,
    PERMISSIONS.SONG_VIEW,
    
    // Setlist viewing
    PERMISSIONS.SETLIST_VIEW
  ]
};

/**
 * Check if user has a specific permission
 * @param {string} userRole - User's role in the band (owner, admin, member)
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission
 */
export function hasPermission(userRole, permission) {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Get all permissions for a role
 * @param {string} role - Role to get permissions for
 * @returns {array} Array of permissions
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user has multiple permissions (ALL must be true)
 * @param {string} userRole - User's role
 * @param {array} permissions - Array of permissions to check
 * @returns {boolean} True if user has ALL permissions
 */
export function hasAllPermissions(userRole, permissions) {
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Check if user has any of the given permissions
 * @param {string} userRole - User's role
 * @param {array} permissions - Array of permissions to check
 * @returns {boolean} True if user has ANY permission
 */
export function hasAnyPermission(userRole, permissions) {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if user can perform action on a band
 * @param {object} user - Current user object
 * @param {string} bandId - Band ID to check permission for
 * @param {object} userBandInfo - User's band info { role, bandId }
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user can perform action
 */
export function canPerformAction(user, bandId, userBandInfo, permission) {
  // Unauthenticated users cannot perform actions
  if (!user || !user.userId) {
    return false;
  }
  
  // User must be part of the band
  if (!userBandInfo || userBandInfo.bandId !== bandId) {
    return false;
  }
  
  // Check permission for user's role in band
  return hasPermission(userBandInfo.role, permission);
}

/**
 * Get all available roles
 * @returns {array} Array of role names
 */
export function getAllRoles() {
  return Object.keys(ROLE_PERMISSIONS);
}

/**
 * Validate if a role is valid
 * @param {string} role - Role to validate
 * @returns {boolean} True if role exists
 */
export function isValidRole(role) {
  return role in ROLE_PERMISSIONS;
}

/**
 * Get role hierarchy (higher = more permissions)
 * @returns {object} Role hierarchy map
 */
export function getRoleHierarchy() {
  return {
    owner: 3,
    admin: 2,
    member: 1
  };
}

/**
 * Check if one role is higher than another
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean} True if role1 is higher than role2
 */
export function isRoleHigherThan(role1, role2) {
  const hierarchy = getRoleHierarchy();
  return (hierarchy[role1] || 0) > (hierarchy[role2] || 0);
}

/**
 * Export permission object for API responses
 */
export const PERMISSION_NAMES = {
  [PERMISSIONS.BAND_CREATE]: 'Create Band',
  [PERMISSIONS.BAND_EDIT]: 'Edit Band',
  [PERMISSIONS.BAND_DELETE]: 'Delete Band',
  [PERMISSIONS.BAND_VIEW]: 'View Band',
  [PERMISSIONS.MEMBER_INVITE]: 'Invite Members',
  [PERMISSIONS.MEMBER_REMOVE]: 'Remove Members',
  [PERMISSIONS.MEMBER_CHANGE_ROLE]: 'Change Member Roles',
  [PERMISSIONS.MEMBER_VIEW]: 'View Members',
  [PERMISSIONS.SONG_CREATE]: 'Create Songs',
  [PERMISSIONS.SONG_EDIT]: 'Edit Songs',
  [PERMISSIONS.SONG_DELETE]: 'Delete Songs',
  [PERMISSIONS.SONG_VIEW]: 'View Songs',
  [PERMISSIONS.SETLIST_CREATE]: 'Create Setlists',
  [PERMISSIONS.SETLIST_EDIT]: 'Edit Setlists',
  [PERMISSIONS.SETLIST_DELETE]: 'Delete Setlists',
  [PERMISSIONS.SETLIST_VIEW]: 'View Setlists',
  [PERMISSIONS.ADMIN_MANAGE_ROLES]: 'Manage Roles',
  [PERMISSIONS.ADMIN_VIEW_LOGS]: 'View Audit Logs'
};
