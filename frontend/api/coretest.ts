import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: 'Core test endpoint',
    timestamp: new Date().toISOString()
  });
}
EOF && echo "   Created coretest.ts"