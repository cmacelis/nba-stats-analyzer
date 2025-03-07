import express from 'express';
import type { Request, Response } from 'express';
import { mockPlayers, mockPlayerStats, mockHeadToHead } from '../data/mockData';
import { Player } from '../types/player';

const router = express.Router();

router.get('/search', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase();
  const players = mockPlayers.filter((player: Player) => 
    player.name.toLowerCase().includes(query) ||
    player.team.toLowerCase().includes(query)
  );
  
  res.json(players);
});

router.get('/:id/stats', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const stats = mockPlayerStats[id];
  
  if (!stats) {
    res.status(404).json({ error: 'Player stats not found' });
    return;
  }
  
  res.json(stats);
});

router.get('/compare/:id1/:id2', (req: Request, res: Response) => {
  const id1 = parseInt(req.params.id1);
  const id2 = parseInt(req.params.id2);
  const key = `${id1}-${id2}`;
  const reverseKey = `${id2}-${id1}`;
  
  const comparison = mockHeadToHead[key] || mockHeadToHead[reverseKey];
  
  if (!comparison) {
    res.status(404).json({ error: 'Comparison data not found' });
    return;
  }
  
  res.json(comparison);
});

export const playerRouter = router; 