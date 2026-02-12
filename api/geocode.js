/**
 * Vercel Serverless Function — Geocode proxy
 * Proxies Google Geocoding API to avoid exposing API key on client.
 *
 * POST /api/geocode
 * Body: { address: string }
 * Returns: { lat, lng } | { error: string }
 */

const ALLOWED_ORIGINS = [
  'https://truck-repair-assistant-v3.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Google API key not configured' });
  }

  const { address } = req.body || {};
  if (!address) {
    return res.status(400).json({ error: 'address is required' });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return res.status(200).json({ lat, lng });
    }

    return res.status(404).json({ error: 'Location not found' });
  } catch (error) {
    console.error('Geocode error:', error);
    return res.status(500).json({ error: 'Geocoding failed' });
  }
}
