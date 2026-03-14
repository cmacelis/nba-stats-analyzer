/**
 * Edge Service — HTTP client to Vercel API endpoints.
 * Reuses all caching/logic already built in the Vercel functions.
 */

import axios from 'axios';

// Lazy — resolved after dotenv has loaded (ES module imports hoist above dotenv.config())
function getApiBase() {
  return process.env.EDGE_API_BASE_URL || process.env.API_BASE_URL || '';
}

export async function getEdgeFeed(stat = 'pts', minMinutes = 20, season = 2025) {
  const res = await axios.get(`${getApiBase()}/api/edge`, {
    params: { stat, min_minutes: minMinutes, season },
    timeout: 15000,
  });
  return res.data;
}

export async function getResearch(playerName, prop = 'points') {
  const res = await axios.get(
    `${getApiBase()}/api/research/${encodeURIComponent(playerName)}`,
    { params: { prop }, timeout: 25000 },
  );
  return res.data;
}

export async function searchPlayer(name) {
  const res = await axios.get(`${getApiBase()}/api/players`, {
    params: { search: name },
    timeout: 10000,
  });
  return res.data;
}
