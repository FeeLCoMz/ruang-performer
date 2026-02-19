import { useAuth } from '../contexts/AuthContext.jsx';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  isValidRole,
  getAllRoles
} from '../utils/permissionUtils.js';


/**
 * usePermission hook
 * @param {string} bandId - Current band ID (if in band context)
 * @param {object} userBandInfo - User's band info (should contain .role)
 * @returns {object} Permission checking helpers for UI logic
 *
 * Usage:
 *   const { can, canAll, canAny, isOwner, isAdmin, isMember, getRole, getUser, getPermissions } = usePermission(bandId, userBandInfo);
 */
export function usePermission(bandId, userBandInfo) {
  const { user } = useAuth();
  const role = userBandInfo?.role || null;

  return {
    /**
     * Check if user has a single permission
     * @param {string} permission
     * @returns {boolean}
     */
    can: (permission) => {
      if (!role) return false;
      return hasPermission(role, permission);
    },

    /**
     * Check if user has ALL of the given permissions
     * @param {array} permissions
     * @returns {boolean}
     */
    canAll: (permissions) => {
      if (!role) return false;
      return hasAllPermissions(role, permissions);
    },

    /**
     * Check if user has ANY of the given permissions
     * @param {array} permissions
     * @returns {boolean}
     */
    canAny: (permissions) => {
      if (!role) return false;
      return hasAnyPermission(role, permissions);
    },

    /**
     * Check if user is band owner
     * @returns {boolean}
     */
    isOwner: () => role === 'owner',

    /**
     * Check if user is band admin
     * @returns {boolean}
     */
    isAdmin: () => role === 'admin',

    /**
     * Check if user is band member
     * @returns {boolean}
     */
    isMember: () => role === 'member',

    /**
     * Get user's role in band
     * @returns {string|null}
     */
    getRole: () => role,

    /**
     * Get all permissions for current role
     * @returns {array}
     */
    getPermissions: () => getPermissionsForRole(role),

    /**
     * Get current user object
     * @returns {object|null}
     */
    getUser: () => user,

    /**
     * Check if role is valid
     * @returns {boolean}
     */
    isValidRole: () => isValidRole(role),

    /**
     * Get all available roles
     * @returns {array}
     */
    getAllRoles: () => getAllRoles(),
  };
}

/**
 * Component wrapper to conditionally render based on permission
 * @param {object} props
 * @param {string} props.permission - Permission to check
 * @param {array} props.permissions - Array of permissions (for canAll/canAny)
 * @param {string} props.type - 'single', 'all', or 'any'
 * @param {string} props.userRole - User's role
 * @param {ReactNode} props.children - Content to render if permitted
 * @param {ReactNode} props.fallback - Content to render if not permitted
 * @returns {ReactNode}
 */
export function PermissionGate({
  permission,
  permissions,
  type = 'single',
  userRole,
  children,
  fallback = null
}) {
  if (!userRole) return fallback;
  let isPermitted = false;
  if (type === 'single') {
    isPermitted = hasPermission(userRole, permission);
  } else if (type === 'all') {
    isPermitted = hasAllPermissions(userRole, permissions);
  } else if (type === 'any') {
    isPermitted = hasAnyPermission(userRole, permissions);
  }
  return isPermitted ? children : fallback;
}
