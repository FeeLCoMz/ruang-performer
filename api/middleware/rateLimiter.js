/**
 * Rate Limiter Middleware
 * Implements token bucket algorithm for rate limiting
 */

const rateLimitStore = new Map();

export const RATE_LIMITS = {
  // Authentication endpoints (stricter)
  AUTH_LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 },      // 5 per 15 min
  AUTH_REGISTER: { maxRequests: 3, windowMs: 60 * 60 * 1000 },   // 3 per hour
  AUTH_FORGOT: { maxRequests: 3, windowMs: 60 * 60 * 1000 },     // 3 per hour
  AUTH_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000 },      // 3 per hour
  AUTH_2FA: { maxRequests: 5, windowMs: 15 * 60 * 1000 },        // 5 per 15 min

  // API endpoints (standard)
  API_READ: { maxRequests: 100, windowMs: 60 * 1000 },           // 100 per min
  API_WRITE: { maxRequests: 50, windowMs: 60 * 1000 },           // 50 per min
  API_DELETE: { maxRequests: 10, windowMs: 60 * 1000 },          // 10 per min

  // General endpoints (permissive)
  GENERAL: { maxRequests: 1000, windowMs: 60 * 1000 }            // 1000 per min
};

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.maxRequests - Max requests in window
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {string} options.keyGenerator - Function to generate rate limit key
 * @param {Function} options.skip - Function to determine if request should be skipped
 * @returns {Function} Express middleware
 */
export function createRateLimiter(options = {}) {
  const maxRequests = options.maxRequests || RATE_LIMITS.GENERAL.maxRequests;
  const windowMs = options.windowMs || RATE_LIMITS.GENERAL.windowMs;
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  const skip = options.skip || (() => false);

  return (req, res, next) => {
    // Skip rate limiting for certain requests
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    // Initialize or get rate limit data
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        requests: [],
        created: now
      });
    }

    const data = rateLimitStore.get(key);

    // Remove old requests outside the window
    data.requests = data.requests.filter(timestamp => now - timestamp < windowMs);

    // Check if limit exceeded
    if (data.requests.length >= maxRequests) {
      const oldestRequest = data.requests[0];
      const retryAfter = Math.ceil((windowMs - (now - oldestRequest)) / 1000);

      return res.status(429).json({
        error: 'Too many requests',
        retryAfter,
        message: `Please try again in ${retryAfter} seconds`
      });
    }

    // Add current request
    data.requests.push(now);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - data.requests.length);
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

    next();
  };
}

/**
 * Default key generator using IP address
 * @param {Object} req - Express request object
 * @returns {string} Rate limit key
 */
function defaultKeyGenerator(req) {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  return `rate-limit:${ip}`;
}

/**
 * User-based key generator
 * @param {Object} req - Express request object
 * @returns {string} Rate limit key
 */
export function userKeyGenerator(req) {
  const userId = req.user?.userId;
  if (userId) {
    return `rate-limit:user:${userId}`;
  }
  return defaultKeyGenerator(req);
}

/**
 * Endpoint-based key generator
 * @param {Object} req - Express request object
 * @returns {string} Rate limit key
 */
export function endpointKeyGenerator(req) {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const endpoint = `${req.method}:${req.path}`;
  return `rate-limit:${ip}:${endpoint}`;
}

/**
 * Cleanup old rate limit data
 * Runs periodically to prevent memory leaks
 */
export function cleanupRateLimits() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.created > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupRateLimits, 60 * 60 * 1000);

/**
 * Reset rate limit for a specific key (admin only)
 * @param {string} key - Rate limit key to reset
 */
export function resetRateLimit(key) {
  rateLimitStore.delete(key);
}

/**
 * Get rate limit status
 * @param {string} key - Rate limit key
 * @returns {Object} Rate limit status
 */
export function getRateLimitStatus(key) {
  if (!rateLimitStore.has(key)) {
    return null;
  }

  const data = rateLimitStore.get(key);
  return {
    key,
    requestCount: data.requests.length,
    oldestRequest: data.requests[0] || null,
    created: data.created
  };
}

export default {
  createRateLimiter,
  userKeyGenerator,
  endpointKeyGenerator,
  cleanupRateLimits,
  resetRateLimit,
  getRateLimitStatus,
  RATE_LIMITS
};
