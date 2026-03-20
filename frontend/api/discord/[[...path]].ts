/**
 * Catch-all Discord API route — consolidates help, results, today into one function.
 * Needed to stay within Vercel Hobby's 12-function limit.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { discordHelpHandler } from '../_handlers/discord-help.js';
import { discordResultsHandler } from '../_handlers/discord-results.js';
import { discordTodayHandler } from '../_handlers/discord-today.js';

function getSubpath(req: VercelRequest): string {
  const qs = req.query.path;
  if (qs) return Array.isArray(qs) ? qs.join('/') : qs;
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const prefix = '/api/discord/';
  return url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const sub = getSubpath(req);

  switch (sub) {
    case 'help':    return discordHelpHandler(req, res);
    case 'results': return discordResultsHandler(req, res);
    case 'today':   return discordTodayHandler(req, res);
    default:        return res.status(404).json({ error: `Unknown discord route: ${sub}` });
  }
}
