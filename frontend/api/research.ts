/**
 * research.ts — compatibility shim for old /api/research?_subpath=<player> calls
 * 
 * This minimal shim maintains backward compatibility with frontend code
 * that calls /api/research?_subpath=<player> or /api/research?_subpath=generate.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { researchHandler } from './_handlers/research.js';
import { generateHandler } from './_handlers/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const subpath = req.query._subpath as string;
  
  if (req.method === 'GET') {
    // GET /api/research?_subpath=<playerName>
    if (!subpath) {
      return res.status(400).json({ error: '_subpath parameter is required' });
    }
    return researchHandler(req, res, subpath);
  }
  
  if (req.method === 'POST') {
    // POST /api/research?_subpath=generate
    if (subpath === 'generate') {
      return generateHandler(req, res);
    }
    return res.status(400).json({ error: 'Invalid _subpath for POST' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}