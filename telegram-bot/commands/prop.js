/**
 * Prop Command — core feature.
 * Handles /prop and natural language prop queries.
 */

import { getResearch } from '../services/edgeService.js';
import { getOrCreateUser } from '../services/userService.js';
import { checkThrottle, checkDailyLimit } from '../services/rateLimiter.js';
import { formatPropResponse } from '../formatters/propFormatter.js';

// Match: "LeBron over 25.5 points", "Jokic under 10.5 reb", "Curry over 4.5 threes"
const PROP_REGEX = /^(.+?)\s+(over|under)\s+([\d.]+)\s+(points?|pts|rebounds?|reb|assists?|ast|threes?|3s|steals?|stl|blocks?|blk|turnovers?|tov|to|fg%?|fg_pct|3p%?|three_pct|ft%?|ft_pct|pra|combined)/i;

// Map user input to API stat types
const STAT_MAP = {
  points: 'points', point: 'points', pts: 'points',
  rebounds: 'rebounds', rebound: 'rebounds', reb: 'rebounds',
  assists: 'assists', assist: 'assists', ast: 'assists',
  threes: 'threes', three: 'threes', '3s': 'threes',
  steals: 'steals', steal: 'steals', stl: 'steals',
  blocks: 'blocks', block: 'blocks', blk: 'blocks',
  turnovers: 'turnovers', turnover: 'turnovers', tov: 'turnovers', to: 'turnovers',
  'fg%': 'fg_pct', fg: 'fg_pct', fg_pct: 'fg_pct',
  '3p%': 'three_pct', '3p': 'three_pct', three_pct: 'three_pct',
  'ft%': 'ft_pct', ft: 'ft_pct', ft_pct: 'ft_pct',
  pra: 'pra', combined: 'pra',
};

export function parseNaturalQuery(text) {
  const match = text.match(PROP_REGEX);
  if (!match) return null;

  const [, playerName, direction, line, rawStat] = match;
  const statType = STAT_MAP[rawStat.toLowerCase()] || 'points';

  return {
    playerName: playerName.trim(),
    direction: direction.toLowerCase(),
    line: parseFloat(line),
    statType,
  };
}

export function parseSlashProp(text) {
  // /prop LeBron over 25.5 points → try natural first
  const natural = parseNaturalQuery(text);
  if (natural) return natural;

  // /prop LeBron points → player + stat only
  const parts = text.trim().split(/\s+/);
  if (parts.length >= 2) {
    const lastWord = parts[parts.length - 1].toLowerCase();
    if (STAT_MAP[lastWord]) {
      return {
        playerName: parts.slice(0, -1).join(' '),
        direction: null,
        line: null,
        statType: STAT_MAP[lastWord],
      };
    }
  }

  // Fallback: treat as player name, default to points
  return {
    playerName: text.trim(),
    direction: null,
    line: null,
    statType: 'points',
  };
}

export async function handleProp(bot, msg, queryText) {
  const chatId = msg.chat.id;

  if (!checkThrottle(chatId)) {
    return bot.sendMessage(chatId, 'Slow down \u2014 1 query every 3 seconds.');
  }

  await getOrCreateUser(chatId, msg.from?.username);
  const { allowed, remaining } = await checkDailyLimit(chatId);
  if (!allowed) {
    return bot.sendMessage(chatId,
      'Daily limit reached (5/5). Upgrade to Pro for unlimited queries.\n/subscribe',
    );
  }

  const parsed = parseSlashProp(queryText);
  if (!parsed.playerName) {
    return bot.sendMessage(chatId,
      'Usage: `/prop LeBron over 25.5 points` or just type `LeBron over 25.5 points`',
      { parse_mode: 'Markdown' },
    );
  }

  bot.sendChatAction(chatId, 'typing');

  try {
    const data = await getResearch(parsed.playerName, parsed.statType);
    if (!data.playerName) {
      return bot.sendMessage(chatId, `Player "${parsed.playerName}" not found. Try a full name like "LeBron James".`);
    }

    const message = formatPropResponse(data, parsed, remaining);
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    console.log(`[prop] ${msg.from?.username || chatId}: ${queryText} -> ${data.playerName}`);
  } catch (err) {
    console.error(`[prop] error for "${queryText}":`, err.message);
    if (err.response?.status === 404) {
      return bot.sendMessage(chatId, `Player "${parsed.playerName}" not found.`);
    }
    await bot.sendMessage(chatId, 'Something went wrong. Try again in a moment.');
  }
}

export async function handleNaturalQuery(bot, msg) {
  const text = msg.text?.trim();
  if (!text) return false;

  const parsed = parseNaturalQuery(text);
  if (!parsed) return false; // Not a prop query

  await handleProp(bot, msg, text);
  return true;
}
