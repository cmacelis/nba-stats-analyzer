/**
 * Edge of the Day — daily scheduled post.
 *
 * Posts the #1 NBA edge pick to #edge-of-the-day at 10:00 AM ET.
 * Uses Firestore REST API for idempotency (stores last posted date).
 * Uses node-cron for scheduling.
 */

import cron from 'node-cron';

// Lazy-loaded after dotenv
let CHANNEL_ID, API_BASE, PROJECT_ID, API_KEY, FS_BASE;
let STAT, SEASON, MIN_MINUTES;

// ── Firestore REST helpers (idempotency) ────────────────────────────────────

async function getLastPostedDate() {
  try {
    const res = await fetch(`${FS_BASE}/meta/edge_of_day?key=${API_KEY}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const doc = await res.json();
    return doc.fields?.lastPostedDate?.stringValue || null;
  } catch { return null; }
}

async function setLastPostedDate(dateStr) {
  const fields = { lastPostedDate: { stringValue: dateStr } };
  const res = await fetch(
    `${FS_BASE}/meta/edge_of_day?updateMask.fieldPaths=lastPostedDate&key=${API_KEY}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }
  );
  if (!res.ok) console.error(`[edge-of-day] Failed to update Firestore: ${res.status}`);
}

// ── Player cooldown (avoid repeating same player) ────────────────────────────

const COOLDOWN_DAYS = 5;

async function getRecentPlayers() {
  try {
    const res = await fetch(`${FS_BASE}/meta/edge_of_day?key=${API_KEY}`);
    if (!res.ok) return [];
    const doc = await res.json();
    const arr = doc.fields?.recentPlayers?.arrayValue?.values;
    if (!Array.isArray(arr)) return [];
    return arr.map(v => v.stringValue).filter(Boolean);
  } catch { return []; }
}

async function addRecentPlayer(playerName) {
  const existing = await getRecentPlayers();
  // Keep last COOLDOWN_DAYS players (FIFO)
  const updated = [...existing, playerName].slice(-COOLDOWN_DAYS);
  const values = updated.map(s => ({ stringValue: s }));
  const fields = { recentPlayers: { arrayValue: { values } } };
  const res = await fetch(
    `${FS_BASE}/meta/edge_of_day?updateMask.fieldPaths=recentPlayers&key=${API_KEY}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }
  );
  if (!res.ok) console.error(`[edge-of-day] Failed to update recentPlayers: ${res.status}`);
}

// ── Fetch best edge pick ────────────────────────────────────────────────────

/**
 * Pick the best edge player that hasn't been posted in the last COOLDOWN_DAYS.
 * Walks the ranked list instead of always taking data[0].
 */
async function fetchBestEdge() {
  const stat = STAT;
  const season = SEASON;
  const minMin = MIN_MINUTES;
  const cooldown = await getRecentPlayers();

  /** Find first non-cooldown player in a response's data array. */
  function pickFromData(data, statLabel) {
    if (!data || data.length === 0) return null;
    // Try non-cooldown first
    const fresh = data.find(p => !cooldown.includes(p.player_name));
    if (fresh) return { ...fresh, stat: statLabel };
    // If all in cooldown (unlikely), fall through
    return null;
  }

  // Try primary stat
  let res = await fetch(`${API_BASE}/api/edge?stat=${stat}&min_minutes=${minMin}&season=${season}`);
  if (!res.ok) throw new Error(`Edge API ${stat} failed: ${res.status}`);
  let body = await res.json();
  let pick = pickFromData(body.data, stat);
  if (pick) return pick;

  // Fallback: alternate stat
  const altStat = stat === 'pts' ? 'pra' : 'pts';
  res = await fetch(`${API_BASE}/api/edge?stat=${altStat}&min_minutes=${minMin}&season=${season}`);
  if (!res.ok) throw new Error(`Edge API ${altStat} failed: ${res.status}`);
  body = await res.json();
  pick = pickFromData(body.data, altStat);
  if (pick) return pick;

  // Fallback: lower min_minutes
  res = await fetch(`${API_BASE}/api/edge?stat=${stat}&min_minutes=10&season=${season}`);
  if (!res.ok) throw new Error(`Edge API ${stat}/10min failed: ${res.status}`);
  body = await res.json();
  pick = pickFromData(body.data, stat);
  if (pick) return pick;

  // Last resort: take data[0] even if on cooldown (better than nothing)
  if (body.data && body.data.length > 0) {
    console.log(`[edge-of-day] all players on cooldown, using best available`);
    return { ...body.data[0], stat };
  }

  return null;
}

// ── Build embed + buttons ───────────────────────────────────────────────────

function buildEmbed(pick) {
  const isOver = pick.delta >= 0;
  const sign   = isOver ? '+' : '';
  const dir    = isOver ? 'OVER' : 'UNDER';
  const color  = isOver ? 0x22c55e : 0x3b82f6;
  const label  = pick.stat === 'pra' ? 'PRA' : 'PTS';

  return {
    title:       `\u{1F3C0} Edge of the Day (Free)`,
    color,
    description: `One free edge each day. VIP Pro unlocks the full Edge Feed + personalized DM alerts.`,
    fields: [
      {
        name:   `Pick: ${pick.player_name} \u2014 ${label} ${dir}`,
        value:  pick.prop_line
          ? `Line: **${pick.prop_line}** (${pick.line_source || 'sportsbook'}) | L5 Avg: **${pick.recent_avg.toFixed(1)}** | \u0394: **${sign}${pick.delta.toFixed(1)}**`
          : `Season Avg: **${pick.season_avg.toFixed(1)}** | L5 Avg: **${pick.recent_avg.toFixed(1)}** | \u0394: **${sign}${pick.delta.toFixed(1)}**`,
        inline: false,
      },
      { name: 'Team',     value: pick.team_abbrev,                    inline: true },
      { name: 'L5 Scores', value: pick.last5.join(' \u00B7 '),       inline: true },
      { name: 'Games',    value: String(pick.games_played),           inline: true },
    ],
    footer: {
      text: 'VIP Pro: more edges + DM rules (/track) + VIP alerts',
    },
    timestamp: new Date().toISOString(),
  };
}

function buildComponents(pick) {
  const compareUrl = `${API_BASE}/compare?p1=${pick.player_id}&s=2025`;
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 5, label: 'Compare', url: compareUrl, emoji: { name: '\u{1F4CA}' } },
        { type: 2, style: 5, label: 'Join VIP Pro', url: 'https://edgedetector.ai/pricing', emoji: { name: '\u2B50' } },
      ],
    },
  ];
}

// ── Post logic ──────────────────────────────────────────────────────────────

async function postEdgeOfDay(client) {
  // Get today's date in ET
  const now = new Date();
  const etDate = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // "YYYY-MM-DD"

  // Idempotency check
  const lastDate = await getLastPostedDate();
  if (lastDate === etDate) {
    console.log(`[edge-of-day] Already posted for ${etDate}, skipping`);
    return;
  }

  // Fetch best pick
  const pick = await fetchBestEdge();
  if (!pick) {
    console.log(`[edge-of-day] No edge data available for ${etDate}`);
    return;
  }

  // Get channel
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel) {
    console.error(`[edge-of-day] Channel ${CHANNEL_ID} not found`);
    return;
  }

  // Send embed
  const embed = buildEmbed(pick);
  const components = buildComponents(pick);

  await channel.send({ embeds: [embed], components });

  // Mark as posted + add player to cooldown
  await setLastPostedDate(etDate);
  await addRecentPlayer(pick.player_name);

  const dir = pick.delta >= 0 ? 'OVER' : 'UNDER';
  console.log(`[edge-of-day] posted ${etDate} player=${pick.player_name} stat=${pick.stat} delta=${pick.delta.toFixed(1)} pick=${dir}`);
}

// ── Scheduler entry point ───────────────────────────────────────────────────

export function startEdgeOfDay(client) {
  // Init env vars (after dotenv)
  CHANNEL_ID  = process.env.EDGE_OF_DAY_CHANNEL_ID;
  API_BASE    = process.env.EDGE_API_BASE_URL || process.env.API_BASE_URL || '';
  PROJECT_ID  = process.env.FIREBASE_PROJECT_ID || '';
  API_KEY     = process.env.FIREBASE_API_KEY || '';
  FS_BASE     = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  STAT        = process.env.EDGE_OF_DAY_STAT || 'pts';
  SEASON      = process.env.EDGE_OF_DAY_SEASON || '2025';
  MIN_MINUTES = process.env.EDGE_OF_DAY_MIN_MINUTES || '20';

  if (!CHANNEL_ID) {
    console.log('[edge-of-day] EDGE_OF_DAY_CHANNEL_ID not set — disabled');
    return;
  }
  if (!API_BASE) {
    console.error('[edge-of-day] EDGE_API_BASE_URL not set — disabled');
    return;
  }

  // Parse schedule time from env (default 10:00)
  const timeET = process.env.EDGE_OF_DAY_TIME_ET || '10:00';
  const [hour, minute] = timeET.split(':').map(Number);
  const cronExpr = `${minute} ${hour} * * *`;

  cron.schedule(cronExpr, async () => {
    try {
      await postEdgeOfDay(client);
    } catch (err) {
      console.error(`[edge-of-day] error:`, err.message || err);
    }
  }, { timezone: 'America/New_York' });

  console.log(`[edge-of-day] Scheduled at ${timeET} ET daily (channel=${CHANNEL_ID}, stat=${STAT})`);

  // Also run immediately on startup if not yet posted today (catches missed posts after restart)
  setTimeout(async () => {
    try {
      await postEdgeOfDay(client);
    } catch (err) {
      console.error(`[edge-of-day] startup check error:`, err.message || err);
    }
  }, 5000);
}

export default { startEdgeOfDay };
