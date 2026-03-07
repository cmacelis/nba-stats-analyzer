/**
 * POST /api/alerts/rules/track
 * 
 * Create a new personalized alert rule for a user.
 * 
 * Body:
 * {
 *   userId: string;          // Discord user ID
 *   league: 'nba' | 'wnba';
 *   playerId?: number;       // Optional: specific player ID
 *   playerName?: string;     // Optional: player name (for display)
 *   stat: 'pts' | 'pra';
 *   direction: 'over' | 'under' | 'both';
 *   minDelta: number;        // Minimum delta threshold
 *   minMinutes: number;      // Minimum minutes per game filter
 * }
 * 
 * Returns:
 * {
 *   id: string;              // Rule ID
 *   success: boolean;
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface AlertRuleInput {
  userId: string;
  league: 'nba' | 'wnba';
  playerId?: number;
  playerName?: string;
  stat: 'pts' | 'pra';
  direction: 'over' | 'under' | 'both';
  minDelta: number;
  minMinutes: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const input: AlertRuleInput = req.body;

    // Validate required fields
    if (!input.userId || !input.league || !input.stat || !input.direction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate league
    if (!['nba', 'wnba'].includes(input.league)) {
      return res.status(400).json({ error: 'Invalid league. Must be "nba" or "wnba"' });
    }

    // Validate stat
    if (!['pts', 'pra'].includes(input.stat)) {
      return res.status(400).json({ error: 'Invalid stat. Must be "pts" or "pra"' });
    }

    // Validate direction
    if (!['over', 'under', 'both'].includes(input.direction)) {
      return res.status(400).json({ error: 'Invalid direction. Must be "over", "under", or "both"' });
    }

    // Validate minDelta
    if (typeof input.minDelta !== 'number' || input.minDelta <= 0) {
      return res.status(400).json({ error: 'minDelta must be a positive number' });
    }

    // Validate minMinutes
    if (typeof input.minMinutes !== 'number' || input.minMinutes < 0) {
      return res.status(400).json({ error: 'minMinutes must be a non-negative number' });
    }

    // Create rule document
    const ruleData = {
      ...input,
      enabled: true,
      createdAt: new Date().toISOString(),
      lastTriggered: null,
    };

    // Add to Firestore
    const docRef = await addDoc(collection(db, 'alert_rules'), ruleData);

    return res.status(201).json({
      id: docRef.id,
      success: true,
      message: 'Alert rule created successfully',
    });
  } catch (error) {
    console.error('[alerts/rules/track] error:', error);
    return res.status(500).json({ 
      error: 'Failed to create alert rule',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}