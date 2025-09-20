/**
 * API Security Module
 * Provides CORS configuration, rate limiting, and input validation
 */

// Allowed origins for CORS (replace with actual domains in production)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
  'http://localhost:4173', // Vite preview
  'https://truck-repair-assistant-v2.vercel.app',
  'https://*.vercel.app', // Vercel preview deployments
];

// Rate limiting configuration
const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 60,
  API_REQUESTS_PER_HOUR: 1000,
  UPLOAD_SIZE_LIMIT: 10 * 1024 * 1024, // 10MB
  AUDIO_SIZE_LIMIT: 50 * 1024 * 1024,  // 50MB for audio files
};

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const hourlyRateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks if origin is allowed for CORS
 */
export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;

  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Check wildcard patterns
  for (const allowedOrigin of ALLOWED_ORIGINS) {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace('*', '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Sets secure CORS headers
 */
export function setCorsHeaders(res: any, req: any): boolean {
  const origin = req.headers.origin || req.headers.referer?.split('/')[2] || '';
  
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // In development, allow localhost variations
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      return false; // Origin not allowed
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  return true;
}

/**
 * Gets client identifier for rate limiting
 */
function getClientId(req: any): string {
  // Use IP address as primary identifier
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress ||
             'unknown';
  
  // Add user agent to make it more specific
  const userAgent = req.headers['user-agent'] || '';
  const userAgentHash = userAgent ? btoa(userAgent).slice(0, 8) : '';
  
  return `${ip}_${userAgentHash}`;
}

/**
 * Checks rate limiting for API requests
 */
export function checkRateLimit(req: any): { allowed: boolean; error?: string; retryAfter?: number } {
  const clientId = getClientId(req);
  const now = Date.now();
  
  // Check per-minute rate limit
  const minuteKey = `${clientId}_${Math.floor(now / 60000)}`;
  const minuteData = rateLimitStore.get(minuteKey) || { count: 0, resetTime: Math.floor(now / 60000) * 60000 + 60000 };
  
  if (minuteData.count >= RATE_LIMITS.API_REQUESTS_PER_MINUTE) {
    const retryAfter = Math.ceil((minuteData.resetTime - now) / 1000);
    return {
      allowed: false,
      error: 'Rate limit exceeded. Too many requests per minute.',
      retryAfter
    };
  }

  // Check per-hour rate limit
  const hourKey = `${clientId}_${Math.floor(now / 3600000)}`;
  const hourData = hourlyRateLimitStore.get(hourKey) || { count: 0, resetTime: Math.floor(now / 3600000) * 3600000 + 3600000 };
  
  if (hourData.count >= RATE_LIMITS.API_REQUESTS_PER_HOUR) {
    const retryAfter = Math.ceil((hourData.resetTime - now) / 1000);
    return {
      allowed: false,
      error: 'Rate limit exceeded. Too many requests per hour.',
      retryAfter
    };
  }

  // Update counters
  minuteData.count++;
  hourData.count++;
  rateLimitStore.set(minuteKey, minuteData);
  hourlyRateLimitStore.set(hourKey, hourData);

  // Clean up old entries (older than 1 hour)
  if (Math.random() < 0.01) { // 1% chance to trigger cleanup
    cleanupRateLimitStore();
  }

  return { allowed: true };
}

/**
 * Cleans up old rate limit entries
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < oneHourAgo) {
      rateLimitStore.delete(key);
    }
  }

  for (const [key, data] of hourlyRateLimitStore.entries()) {
    if (data.resetTime < oneHourAgo) {
      hourlyRateLimitStore.delete(key);
    }
  }
}

/**
 * Validates request content length
 */
export function validateContentLength(req: any, maxSize: number = RATE_LIMITS.UPLOAD_SIZE_LIMIT): { valid: boolean; error?: string } {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  
  if (contentLength > maxSize) {
    return {
      valid: false,
      error: `Request too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`
    };
  }

  return { valid: true };
}

/**
 * Validates audio file upload
 */
export function validateAudioFile(file: { size: number; type: string; name: string }): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check file size
  if (file.size > RATE_LIMITS.AUDIO_SIZE_LIMIT) {
    errors.push(`Audio file too large. Maximum size: ${Math.round(RATE_LIMITS.AUDIO_SIZE_LIMIT / 1024 / 1024)}MB`);
  }

  if (file.size === 0) {
    errors.push('Audio file is empty');
  }

  // Check file type
  const allowedTypes = [
    'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/mp3', 'audio/mpeg',
    'audio/mp4', 'audio/m4a',
    'audio/ogg', 'audio/webm',
    'audio/aac'
  ];

  if (!allowedTypes.includes(file.type.toLowerCase())) {
    errors.push(`Invalid audio format. Allowed: ${allowedTypes.join(', ')}`);
  }

  // Check file extension
  const allowedExtensions = ['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.aac'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
  }

  // Basic security checks
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    errors.push('Invalid file name');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes text input to prevent XSS
 */
export function sanitizeTextInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .trim()
    .substring(0, 10000); // Limit length
}

/**
 * Validates JSON input
 */
export function validateJsonInput(input: any, maxDepth: number = 10): { valid: boolean; error?: string } {
  try {
    if (typeof input === 'string') {
      input = JSON.parse(input);
    }

    // Check depth to prevent deep object attacks
    function checkDepth(obj: any, depth: number = 0): boolean {
      if (depth > maxDepth) return false;
      
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (!checkDepth(obj[key], depth + 1)) {
            return false;
          }
        }
      }
      return true;
    }

    if (!checkDepth(input)) {
      return { valid: false, error: 'Object structure too deep' };
    }

    // Check for potentially dangerous content
    const jsonString = JSON.stringify(input);
    if (jsonString.length > 1024 * 1024) { // 1MB limit
      return { valid: false, error: 'JSON payload too large' };
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /__proto__/i,
      /constructor/i,
      /prototype/i,
      /eval\(/i,
      /function\(/i,
      /javascript:/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(jsonString)) {
        return { valid: false, error: 'JSON contains potentially dangerous content' };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON format' };
  }
}

/**
 * API Security middleware function
 */
export function securityMiddleware(req: any, res: any): { allowed: boolean; error?: string } {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Check CORS
  if (!setCorsHeaders(res, req)) {
    return { allowed: false, error: 'Origin not allowed' };
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return { allowed: true };
  }

  // Check rate limiting
  const rateLimitResult = checkRateLimit(req);
  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', rateLimitResult.retryAfter?.toString() || '60');
    return { allowed: false, error: rateLimitResult.error };
  }

  // Check content length for POST requests
  if (req.method === 'POST') {
    const contentValidation = validateContentLength(req);
    if (!contentValidation.valid) {
      return { allowed: false, error: contentValidation.error };
    }
  }

  return { allowed: true };
}

/**
 * Gets rate limit information for client
 */
export function getRateLimitInfo(req: any): { 
  remaining: number; 
  resetTime: number;
  hourlyRemaining: number;
  hourlyResetTime: number;
} {
  const clientId = getClientId(req);
  const now = Date.now();
  
  const minuteKey = `${clientId}_${Math.floor(now / 60000)}`;
  const minuteData = rateLimitStore.get(minuteKey) || { count: 0, resetTime: Math.floor(now / 60000) * 60000 + 60000 };
  
  const hourKey = `${clientId}_${Math.floor(now / 3600000)}`;
  const hourData = hourlyRateLimitStore.get(hourKey) || { count: 0, resetTime: Math.floor(now / 3600000) * 3600000 + 3600000 };

  return {
    remaining: Math.max(0, RATE_LIMITS.API_REQUESTS_PER_MINUTE - minuteData.count),
    resetTime: minuteData.resetTime,
    hourlyRemaining: Math.max(0, RATE_LIMITS.API_REQUESTS_PER_HOUR - hourData.count),
    hourlyResetTime: hourData.resetTime
  };
}