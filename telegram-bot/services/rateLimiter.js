/**
 * Rate Limiter — in-memory throttle + daily query limit via Firestore.
 */

import { incrementQueryCount } from './userService.js';

const THROTTLE_MS = 3000;
const lastRequest = new Map();

export function checkThrottle(chatId) {
  const now = Date.now();
  const last = lastRequest.get(chatId);
  if (last && now - last < THROTTLE_MS) return false;
  lastRequest.set(chatId, now);
  return true;
}

export async function checkDailyLimit(chatId) {
  return incrementQueryCount(chatId);
}
