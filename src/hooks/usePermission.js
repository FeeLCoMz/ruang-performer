import { useAuth } from '../contexts/AuthContext.jsx';
import { hasPermission, hasAllPermissions, hasAnyPermission, canPerformAction } from '../utils/permissionUtils.js';

/**
 * Hook to check permissions in React components
 * @param {string} bandId - Current band ID (if in band context)
 * @param {object} userBandInfo - User's role info for band
 * @returns {object} Permission checking functions
 */
export function usePermission(userBandInfo) {
  const { user } = useAuth();
  
  // (debug log removed)
  return {
    /**
     * Check single permission
     * @param {string} permission - Permission to check
     * @returns {boolean}
     */
    can: (permission) => {
      if (!userBandInfo) return false;
      return hasPermission(userBandInfo.role, permission);
    },
    
    /**
     * Check multiple permissions (ALL must be true)
     * @param {array} permissions - Permissions to check
     * @returns {boolean}
     */
    canAll: (permissions) => {
      if (!userBandInfo) return false;
      return hasAllPermissions(userBandInfo.role, permissions);
    },
    
    /**
     * Check multiple permissions (ANY can be true)
     * @param {array} permissions - Permissions to check
     * @returns {boolean}
     */
    canAny: (permissions) => {
      if (!userBandInfo) return false;
      return hasAnyPermission(userBandInfo.role, permissions);
    },
    
    /**
     * Check if user is band owner
     * @returns {boolean}
     */
    isOwner: () => {
      return userBandInfo?.role === 'owner';
    },
    
    /**
     * Check if user is band admin
     * @returns {boolean}
     */
    isAdmin: () => {
      return ['owner', 'admin'].includes(userBandInfo?.role);
    },
    
    /**
     * Get user's role in band
     * @returns {string} User's role (owner, admin, member)
     */
    getRole: () => {
      return userBandInfo?.role || null;
    },
    
    /**
     * Get current user
     * @returns {object} Current user
     */
    getUser: () => {
      return user;
    }
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
  if (!userRole) {
    return fallback;
  }
  
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
