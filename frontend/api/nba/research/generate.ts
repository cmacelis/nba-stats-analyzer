import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import { generateHandler } from '../../_handlers/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  return generateHandler(req, res);
}
