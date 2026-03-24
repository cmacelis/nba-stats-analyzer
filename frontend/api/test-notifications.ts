/**
 * test-notifications.ts — minimal test endpoint to verify API deployment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  
  const subpath = req.query._subpath as string | undefined;
  
  if (req.method === 'GET' && subpath === 'test') {
    return res.status(200).json({ 
      success: true, 
      message: 'Test endpoint works!',
      timestamp: new Date().toISOString()
    });
  }
  
  if (req.method === 'POST' && subpath === 'register') {
    // Simple test without Firebase
    const { device_token, platform } = req.body || {};
    
    if (!device_token) {
      return res.status(400).json({ error: 'Missing device_token' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Device token received (test mode)',
      device_token,
      platform: platform || 'ios',
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(404).json({
    error: 'Endpoint not found',
    available: ['GET /api/test-notifications/test', 'POST /api/test-notifications/register']
  });
}