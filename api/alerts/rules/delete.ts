/**
 * DELETE /api/alerts/rules/delete
 * 
 * Delete an alert rule by ID.
 * 
 * Body:
 * {
 *   ruleId: string;          // Rule ID to delete
 *   userId: string;          // Discord user ID (for verification)
 * }
 * 
 * Returns:
 * {
 *   success: boolean;
 *   message: string;
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, deleteDoc } from 'firebase/firestore';

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

interface DeleteRequest {
  ruleId: string;
  userId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'DELETE only' });
  }

  try {
    const { ruleId, userId }: DeleteRequest = req.body;

    if (!ruleId || !userId) {
      return res.status(400).json({ error: 'ruleId and userId are required' });
    }

    // Get the rule to verify ownership
    const ruleRef = doc(db, 'alert_rules', ruleId);
    const ruleDoc = await getDoc(ruleRef);

    if (!ruleDoc.exists()) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const ruleData = ruleDoc.data();
    
    // Verify the user owns this rule
    if (ruleData.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this rule' });
    }

    // Delete the rule
    await deleteDoc(ruleRef);

    return res.status(200).json({
      success: true,
      message: 'Alert rule deleted successfully',
    });
  } catch (error) {
    console.error('[alerts/rules/delete] error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete alert rule',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}