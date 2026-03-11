/**
 * Alert Processor for Discord Bot
 *
 * Polls Firestore via REST API (no firebase SDK / no gRPC) for pending alerts
 * and sends DMs to users every 30 seconds.
 */

// Lazy-loaded after dotenv.config() has run (ES module imports execute before body).
let PROJECT_ID, API_KEY, BASE;

// ── Firestore REST helpers ──────────────────────────────────────────────────

function fromFsValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) {
    const obj = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) obj[k] = fromFsValue(val);
    return obj;
  }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
  return null;
}

function docToObj(doc) {
  const id = doc.name.split('/').pop();
  const obj = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) obj[k] = fromFsValue(v);
  return obj;
}

/** Query pending_alerts where processed == false, limit 25. */
async function fetchPendingAlerts() {
  const url = `${BASE}:runQuery?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'pending_alerts' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'processed' },
            op: 'EQUAL',
            value: { booleanValue: false },
          },
        },
        limit: 25,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firestore query failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const results = await res.json();
  return results.filter(r => r.document).map(r => docToObj(r.document));
}

/** Delete a document by ID. */
async function deleteAlert(docId) {
  const res = await fetch(`${BASE}/pending_alerts/${docId}?key=${API_KEY}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Firestore delete failed: ${res.status}`);
  }
}

/** Mark a document as error with reason. */
async function markError(docId, reason) {
  const fields = {
    status:    { stringValue: 'error' },
    processed: { booleanValue: true },
    error:     { stringValue: reason },
    errorAt:   { stringValue: new Date().toISOString() },
  };
  const masks = Object.keys(fields).map(m => `updateMask.fieldPaths=${m}`).join('&');
  const res = await fetch(`${BASE}/pending_alerts/${docId}?${masks}&key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    console.error(`[processor] markError ${docId} failed: ${res.status}`);
  }
}

// ── DM sending ──────────────────────────────────────────────────────────────

async function sendAlertDM(client, alert) {
  const user = await client.users.fetch(alert.userId);
  if (!user) throw new Error(`User ${alert.userId} not found`);

  const sign = alert.delta >= 0 ? '+' : '';
  const emoji = alert.delta >= 0 ? '\u{1F525}' : '\u{1F9CA}';
  const direction = alert.delta >= 0 ? 'Over' : 'Under';
  const color = alert.delta >= 0 ? 0x22c55e : 0x3b82f6;

  const embed = {
    title: `${emoji} ${alert.playerName} (${alert.teamAbbrev}) \u2014 ${(alert.stat || 'pts').toUpperCase()} ${direction} Edge`,
    color,
    description: `**${sign}${Number(alert.delta).toFixed(1)}** vs season average (L5 trending ${alert.delta >= 0 ? 'hot' : 'cold'})`,
    fields: [
      { name: 'Season Avg', value: Number(alert.seasonAvg).toFixed(1), inline: true },
      { name: 'L5 Avg',     value: Number(alert.recentAvg).toFixed(1), inline: true },
      { name: '\u0394',     value: `${sign}${Number(alert.delta).toFixed(1)}`, inline: true },
      { name: 'Your Rule',  value: `${alert.direction || 'both'} ${(alert.stat || 'pts').toUpperCase()} \u2265 ${alert.minDelta}`, inline: true },
      { name: 'League',     value: (alert.league || 'nba').toUpperCase(), inline: true },
      { name: 'Rule ID',    value: String(alert.ruleId || ''), inline: true },
    ],
    footer: { text: 'EdgeDetector.ai Alert' },
    timestamp: new Date().toISOString(),
  };

  await user.send({
    content: '\u{1F514} **Personal Alert Triggered!**',
    embeds: [embed],
  });

  return user.tag;
}

// ── Main polling loop ───────────────────────────────────────────────────────

export async function startAlertProcessor(client) {
  // Init env vars now (after dotenv.config() has run in index.js)
  PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
  API_KEY    = process.env.FIREBASE_API_KEY || '';
  BASE       = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

  console.log(`[processor] Started — polling every 30s (project=${PROJECT_ID})`);

  if (!PROJECT_ID || !API_KEY) {
    console.error('[processor] FIREBASE_PROJECT_ID or FIREBASE_API_KEY not set — processor disabled');
    return;
  }

  setInterval(async () => {
    try {
      const alerts = await fetchPendingAlerts();
      console.log(`[processor] pending_alerts fetched: ${alerts.length}`);

      for (const alert of alerts) {
        try {
          const tag = await sendAlertDM(client, alert);
          await deleteAlert(alert.id);
          console.log(`[processor] \u2713 sent ${alert.id} to ${tag}`);
        } catch (dmErr) {
          const reason = dmErr.code === 50007
            ? 'User has DMs disabled'
            : dmErr.message || String(dmErr);
          console.error(`[processor] \u2717 DM failed ${alert.id} user=${alert.userId}: ${reason}`);
          await markError(alert.id, reason).catch(() => {});
        }

        // Rate limit: 1s between DMs
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error('[processor] poll error:', err.message);
    }
  }, 30000);
}

export default { startAlertProcessor };
