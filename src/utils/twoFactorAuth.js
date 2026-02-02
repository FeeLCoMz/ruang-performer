/**
 * Verify TOTP token (Frontend only)
 * Uses a simple algorithm to verify TOTP tokens
 * @param {string} secret - User's TOTP secret (base32)
 * @param {string} token - 6-digit token to verify
 * @returns {boolean} Token is valid
 */
export function verifyTwoFactorToken(secret, token) {
  try {
    // For frontend verification, we accept the token as-is
    // Real verification happens on the server with speakeasy
    // This is a placeholder for client-side validation
    
    if (!token || !/^\d{6}$/.test(token)) {
      return false;
    }
    
    // Token format validation passed
    // Actual TOTP verification happens server-side
    return true;
  } catch (error) {
    console.error('2FA verification error:', error);
    return false;
  }
}

/**
 * Verify backup code format
 * @param {string} backupCode - Backup code to verify
 * @returns {boolean} Code format is valid
 */
export function isValidBackupCodeFormat(backupCode) {
  // Backup codes are formatted as XXXX-XXXX
  if (!backupCode || typeof backupCode !== 'string') {
    return false;
  }
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(backupCode.trim());
}

/**
 * Check if backup codes are needed (less than 3 remaining)
 * @param {number} usedCount - Number of backup codes used
 * @param {number} totalCount - Total backup codes (default 8)
 * @returns {boolean}
 */
export function needsNewBackupCodes(usedCount, totalCount = 8) {
  return (totalCount - usedCount) < 3;
}

/**
 * Format backup codes for display
 * @param {Array} codes - Raw backup codes
 * @returns {string} Formatted backup codes
 */
export function formatBackupCodesForDisplay(codes) {
  if (!Array.isArray(codes)) {
    return '';
  }
  return codes.map((code, index) => `${index + 1}. ${code}`).join('\n');
}

export default {
  verifyTwoFactorToken,
  isValidBackupCodeFormat,
  needsNewBackupCodes,
  formatBackupCodesForDisplay
};
