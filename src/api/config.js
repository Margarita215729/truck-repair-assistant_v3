export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // In this environment, we need to get the API key from the provided secrets
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!googleMapsApiKey) {
      return res.status(500).json({ 
        error: 'Google Maps API key not configured',
        help: 'Please set the GOOGLE_MAPS_API_KEY environment variable'
      });
    }

    res.status(200).json({
      googleMapsApiKey,
      configured: true
    });
  } catch (error) {
    console.error('Config API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}