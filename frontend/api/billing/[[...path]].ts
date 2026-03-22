import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fail } from '../shared/response';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Return 501 Not Implemented for all billing routes
  const response = fail(
    'NOT_IMPLEMENTED',
    'Billing endpoints are not yet implemented. This is part of Phase A foundation.',
    501
  );
  
  res.status(501).json(response);
}