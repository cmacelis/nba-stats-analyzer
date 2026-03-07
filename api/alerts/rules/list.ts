/**
 * GET /api/alerts/rules/list?userId={discordUserId}
 * 
 * List all alert rules for a specific user.
 * 
 * Returns:
 * {
 *   rules: Array<{
 *     id: string;
 *     userId: string;
 *     league: 'nba' | 'wnba';
 *     playerId?: number;
 *     playerName?: string;
 *     stat: 'pts' | 'pra';
 *     direction: 'over' | 'under' | 'both';
 *     minDelta: number;
 *     minMinutes: number;
 *     enabled: boolean;
 *     createdAt: string;
 *     lastTriggered?: string;
 *   }>;
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    // Query rules for this user
    const rulesRef = collection(db, 'alert_rules');
    const q = query(rulesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const rules = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        league: data.league,
        playerId: data.playerId || null,
        playerName: data.playerName || null,
        stat: data.stat,
        direction: data.direction,
        minDelta: data.minDelta,
        minMinutes: data.minMinutes,
        enabled: data.enabled !== false, // Default to true if not set
        createdAt: data.createdAt,
        lastTriggered: data.lastTriggered || null,
      };
    });

    // Sort by creation date (newest first)
    rules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.status(200).json({
      success: true,
      count: rules.length,
      rules,
    });
  } catch (error) {
    console.error('[alerts/rules/list] error:', error);
    return res.status(500).json({ 
      error: 'Failed to list alert rules',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}