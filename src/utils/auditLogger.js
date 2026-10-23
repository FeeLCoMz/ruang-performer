/**
 * Audit Logger Utility
 * Provides utilities for creating and formatting audit log entries
 */

export const AUDIT_ACTIONS = {
  // User actions
  USER_REGISTER: 'USER_REGISTER',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_LOGIN_BLOCKED: 'USER_LOGIN_BLOCKED',
  USER_PASSWORD_CHANGE: 'USER_PASSWORD_CHANGE',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',

  // Band actions
  BAND_CREATED: 'BAND_CREATED',
  BAND_UPDATED: 'BAND_UPDATED',
  BAND_DELETED: 'BAND_DELETED',

  // Member actions
  MEMBER_INVITED: 'MEMBER_INVITED',
  MEMBER_JOINED: 'MEMBER_JOINED',
  MEMBER_LEFT: 'MEMBER_LEFT',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  MEMBER_ROLE_CHANGED: 'MEMBER_ROLE_CHANGED',

  // Permission actions
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',

  // Song actions
  SONG_CREATED: 'SONG_CREATED',
  SONG_UPDATED: 'SONG_UPDATED',
  SONG_DELETED: 'SONG_DELETED',

  // Setlist actions
  SETLIST_CREATED: 'SETLIST_CREATED',
  SETLIST_UPDATED: 'SETLIST_UPDATED',
  SETLIST_DELETED: 'SETLIST_DELETED',

  // Tag deteksi ChordDisplay (global, ditulis server/handlers/settings.js)
  TAG_DETECTION_UPDATED: 'TAG_DETECTION_UPDATED',
  TAG_DETECTION_GROUP_RESET: 'TAG_DETECTION_GROUP_RESET',
  TAG_DETECTION_RESET: 'TAG_DETECTION_RESET',
};

export const ACTION_CATEGORIES = {
  USER: 'USER',
  BAND: 'BAND',
  MEMBER: 'MEMBER',
  PERMISSION: 'PERMISSION',
  SONG: 'SONG',
  SETLIST: 'SETLIST',
  TAG: 'TAG',
  SECURITY: 'SECURITY'
};

export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Get severity level for an action
 * @param {string} action - Audit action
 * @returns {string} Severity level
 */
export function getActionSeverity(action) {
  const criticalActions = [
    AUDIT_ACTIONS.BAND_DELETED,
    AUDIT_ACTIONS.MEMBER_REMOVED,
    AUDIT_ACTIONS.USER_PASSWORD_CHANGE,
    AUDIT_ACTIONS.MEMBER_ROLE_CHANGED,
    AUDIT_ACTIONS.PERMISSION_REVOKED,
    AUDIT_ACTIONS.USER_DELETED,
  ];

  const highActions = [
    AUDIT_ACTIONS.BAND_CREATED,
    AUDIT_ACTIONS.MEMBER_INVITED,
    AUDIT_ACTIONS.MEMBER_JOINED,
    AUDIT_ACTIONS.PERMISSION_GRANTED,
    AUDIT_ACTIONS.USER_PASSWORD_RESET,
    AUDIT_ACTIONS.USER_LOGIN_FAILED,
    AUDIT_ACTIONS.USER_LOGIN_BLOCKED,
    // Reset tag mengubah deteksi semua lagu → setara aksi berisiko tinggi.
    AUDIT_ACTIONS.TAG_DETECTION_GROUP_RESET,
    AUDIT_ACTIONS.TAG_DETECTION_RESET,
  ];

  if (criticalActions.includes(action)) return SEVERITY_LEVELS.CRITICAL;
  if (highActions.includes(action)) return SEVERITY_LEVELS.HIGH;
  if (action.includes('UPDATED')) return SEVERITY_LEVELS.MEDIUM;
  return SEVERITY_LEVELS.LOW;
}

/**
 * Get category for an action
 * @param {string} action - Audit action
 * @returns {string} Action category
 */
export function getActionCategory(action) {
  if (action.startsWith('USER_')) return ACTION_CATEGORIES.USER;
  if (action.startsWith('BAND_')) return ACTION_CATEGORIES.BAND;
  // Perubahan role anggota adalah aksi permission, bukan sekadar member.
  if (action === AUDIT_ACTIONS.MEMBER_ROLE_CHANGED) return ACTION_CATEGORIES.PERMISSION;
  if (action.startsWith('MEMBER_')) return ACTION_CATEGORIES.MEMBER;
  if (action.startsWith('PERMISSION_') || action.startsWith('ROLE_'))
    return ACTION_CATEGORIES.PERMISSION;
  if (action.startsWith('SONG_')) return ACTION_CATEGORIES.SONG;
  if (action.startsWith('SETLIST_')) return ACTION_CATEGORIES.SETLIST;
  if (action.startsWith('TAG_')) return ACTION_CATEGORIES.TAG;
  return ACTION_CATEGORIES.SECURITY;
}

/**
 * Nama tampilan ramah untuk aksi yang formatnya tidak memadai.
 * 'TAG_DETECTION_UPDATED' → 'Tag Deteksi Diubah' lebih jelas di tabel audit
 * daripada hasil generic split-underscore.
 */
const ACTION_DISPLAY_OVERRIDES = {
  [AUDIT_ACTIONS.TAG_DETECTION_UPDATED]: 'Tag Deteksi Diubah',
  [AUDIT_ACTIONS.TAG_DETECTION_GROUP_RESET]: 'Tag Deteksi: Grup Direset',
  [AUDIT_ACTIONS.TAG_DETECTION_RESET]: 'Tag Deteksi: Semua Direset',
};

/**
 * Format action name for display
 * @param {string} action - Audit action
 * @returns {string} Formatted action name
 */
export function formatActionName(action) {
  if (ACTION_DISPLAY_OVERRIDES[action]) return ACTION_DISPLAY_OVERRIDES[action];
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Create an audit log entry
 * @param {Object} params - Log parameters
 * @returns {Object} Formatted audit log entry
 */
export function createAuditEntry({
  action,
  userId,
  bandId = null,
  targetUserId = null,
  resourceId = null,
  resourceType = null,
  changes = {},
  ipAddress = null,
  userAgent = null,
  status = 'success',
  errorMessage = null,
  metadata = {}
}) {
  return {
    action,
    userId,
    bandId,
    targetUserId,
    resourceId,
    resourceType,
    changes,
    ipAddress,
    userAgent,
    status,
    errorMessage,
    metadata,
    severity: getActionSeverity(action),
    category: getActionCategory(action),
    displayName: formatActionName(action),
    timestamp: new Date().toISOString(),
    createdAt: new Date()
  };
}

/**
 * Format audit log for display
 * @param {Object} log - Raw audit log from database
 * @returns {Object} Formatted log for UI
 */
export function formatAuditLog(log) {
  return {
    id: log.id,
    action: log.action,
    displayName: formatActionName(log.action),
    category: log.category,
    severity: log.severity,
    user: log.username || 'Unknown User',
    userId: log.userId,
    band: log.bandName || 'N/A',
    bandId: log.bandId,
    target: log.targetUsername || null,
    resource: log.resourceType,
    changes: log.changes ? JSON.parse(log.changes) : {},
    status: log.status,
    timestamp: new Date(log.createdAt).toLocaleString(),
    createdAt: log.createdAt
  };
}

/**
 * Check if action requires additional validation
 * @param {string} action - Audit action
 * @returns {boolean}
 */
export function isSecurityAction(action) {
  const securityActions = [
    AUDIT_ACTIONS.USER_LOGIN,
    AUDIT_ACTIONS.USER_LOGIN_FAILED,
    AUDIT_ACTIONS.USER_LOGIN_BLOCKED,
    AUDIT_ACTIONS.USER_PASSWORD_CHANGE,
    AUDIT_ACTIONS.MEMBER_ROLE_CHANGED,
    AUDIT_ACTIONS.BAND_DELETED,
    AUDIT_ACTIONS.MEMBER_REMOVED,
    AUDIT_ACTIONS.PERMISSION_REVOKED,
  ];
  return securityActions.includes(action);
}

/**
 * Filter logs by criteria
 * @param {Array} logs - Array of audit logs
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered logs
 */
export function filterAuditLogs(logs, filters = {}) {
  let result = logs;

  if (filters.category) {
    result = result.filter(log => log.category === filters.category);
  }

  if (filters.severity) {
    result = result.filter(log => log.severity === filters.severity);
  }

  if (filters.action) {
    result = result.filter(log => log.action === filters.action);
  }

  if (filters.userId) {
    result = result.filter(log => log.userId === filters.userId);
  }

  if (filters.bandId) {
    result = result.filter(log => log.bandId === filters.bandId);
  }

  if (filters.status) {
    result = result.filter(log => log.status === filters.status);
  }

  // Rentang tanggal inklusif: `endDate` dari input type=date menunjuk 00:00,
  // jadi batas atas digeser ke akhir hari itu agar entri hari terakhir ikut.
  if (filters.startDate || filters.endDate) {
    const start = filters.startDate ? new Date(filters.startDate) : null;
    let end = null;
    if (filters.endDate) {
      const rawEnd = new Date(filters.endDate);
      end = Number.isNaN(rawEnd.getTime()) ? null : new Date(rawEnd.getTime() + 24 * 60 * 60 * 1000 - 1);
    }

    result = result.filter(log => {
      const logDate = new Date(log.createdAt);
      if (Number.isNaN(logDate.getTime())) return false;
      if (start && !Number.isNaN(start.getTime()) && logDate < start) return false;
      if (end && logDate > end) return false;
      return true;
    });
  }

  return result;
}

/**
 * Rentang tanggal siap pakai untuk filter audit log (nilai input type=date).
 * @param {string} preset - Hari ini / 7 / 30 / 90 hari terakhir
 * @param {Date} [now] - referensi waktu (memudahkan test)
 * @returns {{ startDate: string, endDate: string }}
 */
export function AUDIT_DATE_PRESETS(preset, now = new Date()) {
  const toInput = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const endDate = toInput(now);
  if (preset === 'today') return { startDate: endDate, endDate };

  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  const start = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { startDate: toInput(start), endDate };
}

/**
 * Generate audit report
 * @param {Array} logs - Array of audit logs
 * @returns {Object} Audit report
 */
export function generateAuditReport(logs) {
  const report = {
    totalEvents: logs.length,
    byCategory: {},
    bySeverity: {},
    byStatus: {},
    topActions: {},
    timeline: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    },
    suspiciousActivity: []
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

  logs.forEach(log => {
    // Count by category
    report.byCategory[log.category] = (report.byCategory[log.category] || 0) + 1;

    // Count by severity
    report.bySeverity[log.severity] = (report.bySeverity[log.severity] || 0) + 1;

    // Count by status
    report.byStatus[log.status] = (report.byStatus[log.status] || 0) + 1;

    // Count actions
    report.topActions[log.action] = (report.topActions[log.action] || 0) + 1;

    // Timeline
    const logDate = new Date(log.createdAt);
    if (logDate >= today) report.timeline.today++;
    if (logDate >= weekAgo) report.timeline.thisWeek++;
    if (logDate >= monthAgo) report.timeline.thisMonth++;

    // Find suspicious activity
    if (log.status === 'failed' && isSecurityAction(log.action)) {
      report.suspiciousActivity.push({
        log,
        reason: 'Aksi keamanan gagal',
        confidence: 'high'
      });
    }

    if (log.severity === SEVERITY_LEVELS.CRITICAL) {
      report.suspiciousActivity.push({
        log,
        reason: 'Aksi dengan tingkat kritis',
        confidence: 'medium'
      });
    }
  });

  // Sort top actions
  report.topActions = Object.entries(report.topActions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [action, count]) => {
      obj[action] = count;
      return obj;
    }, {});

  return report;
}

export default {
  AUDIT_ACTIONS,
  ACTION_CATEGORIES,
  SEVERITY_LEVELS,
  getActionSeverity,
  getActionCategory,
  formatActionName,
  createAuditEntry,
  formatAuditLog,
  isSecurityAction,
  filterAuditLogs,
  generateAuditReport,
  AUDIT_DATE_PRESETS
};
