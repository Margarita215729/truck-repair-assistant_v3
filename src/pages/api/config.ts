import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!googleMapsApiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    res.status(200).json({
      googleMapsApiKey
    });
  } catch (error) {
    console.error('Config API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}