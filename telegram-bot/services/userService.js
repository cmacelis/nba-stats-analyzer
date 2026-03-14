/**
 * User Service — Firestore REST API for telegram_users collection.
 * Same pattern as discord-bot/alertProcessor.js.
 */

// Lazy — resolved after dotenv has loaded (ES module imports hoist above dotenv.config())
function fs() {
  const pid = process.env.FIREBASE_PROJECT_ID || '';
  const key = process.env.FIREBASE_API_KEY || '';
  return {
    key,
    base: `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents`,
  };
}

// ── Firestore value helpers ─────────────────────────────────────────────────

function toFsValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  return { stringValue: String(val) };
}

function fromFsDoc(doc) {
  if (!doc?.fields) return null;
  const obj = {};
  for (const [key, val] of Object.entries(doc.fields)) {
    if ('stringValue' in val) obj[key] = val.stringValue;
    else if ('integerValue' in val) obj[key] = parseInt(val.integerValue, 10);
    else if ('doubleValue' in val) obj[key] = val.doubleValue;
    else if ('booleanValue' in val) obj[key] = val.booleanValue;
    else if ('nullValue' in val) obj[key] = null;
    else obj[key] = null;
  }
  return obj;
}

// ── CRUD ────────────────────────────────────────────────────────────────────

function docId(chatId) {
  return `chat_${chatId}`;
}

async function getDoc(chatId) {
  try {
    const { base, key } = fs();
    const res = await fetch(`${base}/telegram_users/${docId(chatId)}?key=${key}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return fromFsDoc(await res.json());
  } catch {
    return null;
  }
}

async function setDoc(chatId, data, useMask = true) {
  const { base, key } = fs();
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFsValue(v);
  }

  // For new documents, skip updateMask (full create/overwrite)
  // For partial updates, use updateMask to only touch specified fields
  let url = `${base}/telegram_users/${docId(chatId)}?key=${key}`;
  if (useMask) {
    const masks = Object.keys(data).map(k => `updateMask.fieldPaths=${k}`).join('&');
    url += `&${masks}`;
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    console.error(`[userService] setDoc failed for ${chatId}: ${res.status} ${await res.text().catch(() => '')}`);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function getOrCreateUser(chatId, username) {
  let user = await getDoc(chatId);
  if (user) return user;

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const newUser = {
    telegramChatId: String(chatId),
    username: username || '',
    vipActive: false,
    subscribedBriefing: true,
    queryCount: 0,
    queryDate: today,
    createdAt: now,
  };
  await setDoc(chatId, newUser, false); // false = no mask, full create
  return newUser;
}

export async function incrementQueryCount(chatId) {
  const user = await getDoc(chatId);
  if (!user) return { allowed: true, remaining: 4 };

  // VIP users have no daily limit
  if (user.vipActive) return { allowed: true, remaining: Infinity };

  const today = new Date().toISOString().slice(0, 10);
  let count = user.queryCount || 0;

  // Reset if new day
  if (user.queryDate !== today) {
    count = 0;
  }

  const FREE_LIMIT = 5;
  if (count >= FREE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  count += 1;
  await setDoc(chatId, { queryCount: count, queryDate: today });
  return { allowed: true, remaining: FREE_LIMIT - count };
}

export async function isVip(chatId) {
  const user = await getDoc(chatId);
  return user?.vipActive === true;
}

export async function getAllBriefingSubscribers() {
  try {
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'telegram_users' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'subscribedBriefing' },
            op: 'EQUAL',
            value: { booleanValue: true },
          },
        },
      },
    };
    const { base, key } = fs();
    const res = await fetch(
      `${base}:runQuery?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) return [];
    const results = await res.json();
    return results
      .map(r => fromFsDoc(r.document))
      .filter(Boolean)
      .map(u => u.telegramChatId);
  } catch (err) {
    console.error('[userService] getAllBriefingSubscribers error:', err.message);
    return [];
  }
}

export async function setBriefingSubscription(chatId, subscribed) {
  await setDoc(chatId, { subscribedBriefing: subscribed });
}
