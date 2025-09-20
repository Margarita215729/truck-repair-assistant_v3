import { securityMiddleware, getRateLimitInfo, sanitizeTextInput } from '../lib/api-security';

export default function handler(req, res) {
  // Apply security middleware
  const securityResult = securityMiddleware(req, res);
  if (!securityResult.allowed) {
    return res.status(429).json({ 
      error: securityResult.error || 'Request not allowed',
      type: 'security_error'
    });
  }

  // Only allow GET requests for this endpoint
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed_methods: ['GET']
    });
  }

  try {
    // Get the API key from environment (already sanitized by environment validation)
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!googleMapsApiKey || googleMapsApiKey.trim().length === 0) {
      return res.status(500).json({ 
        error: 'Google Maps API key not configured',
        help: 'Please set the GOOGLE_MAPS_API_KEY environment variable',
        type: 'configuration_error'
      });
    }

    // Validate API key format (basic check)
    if (googleMapsApiKey.length < 30 || !googleMapsApiKey.startsWith('AIza')) {
      return res.status(500).json({
        error: 'Google Maps API key appears to be invalid',
        type: 'configuration_error'
      });
    }

    // Get rate limit info for response headers
    const rateLimitInfo = getRateLimitInfo(req);
    res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());

    // Return sanitized response
    res.status(200).json({
      googleMapsApiKey: sanitizeTextInput(googleMapsApiKey),
      configured: true,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Config API error:', error);
    
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({ 
      error: 'Internal server error',
      type: 'server_error',
      ...(isDevelopment && { details: error?.message })
    });
  }
}