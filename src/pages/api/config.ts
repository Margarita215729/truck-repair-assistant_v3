import { NextApiRequest, NextApiResponse } from 'next';
import { securityMiddleware, getRateLimitInfo, sanitizeTextInput } from '../../lib/api-security';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply security middleware
  const securityResult = securityMiddleware(req, res);
  if (!securityResult.allowed) {
    return res.status(429).json({ 
      error: securityResult.error || 'Request not allowed',
      type: 'security_error'
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed_methods: ['GET']
    });
  }

  try {
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!googleMapsApiKey || googleMapsApiKey.trim().length === 0) {
      return res.status(500).json({ 
        error: 'Google Maps API key not configured',
        type: 'configuration_error'
      });
    }

    // Validate API key format
    if (googleMapsApiKey.length < 30 || !googleMapsApiKey.startsWith('AIza')) {
      return res.status(500).json({
        error: 'Google Maps API key appears to be invalid',
        type: 'configuration_error'
      });
    }

    // Add rate limit headers
    const rateLimitInfo = getRateLimitInfo(req);
    res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());

    res.status(200).json({
      googleMapsApiKey: sanitizeTextInput(googleMapsApiKey),
      configured: true,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Config API error:', error);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({ 
      error: 'Internal server error',
      type: 'server_error',
      ...(isDevelopment && { details: (error as Error)?.message })
    });
  }
}