import express from 'express';
import axios from 'axios';
import { createEndpointLimiter } from '../utils/rateLimiter';
import { validateRequest, ValidationSchema } from '../utils/validator';

const router = express.Router();
const nbaLimiter = createEndpointLimiter(15, 100);

// NBA API configuration
const NBA_API_BASE = 'https://api.example.com/v1'; // Replace with actual NBA API URL
const NBA_API_KEY = process.env.NBA_API_KEY;

// Error type for better type checking
interface APIError {
  message: string;
  code?: string;
  status?: number;
}

// Validation schemas
const playerStatsSchema: ValidationSchema = {
  playerId: {
    required: true,
    type: 'string',
    pattern: /^\d+$/
  },
  season: {
    required: true,
    type: 'string',
    pattern: /^\d{4}-\d{2}$/
  }
};

// Get player stats
router.get('/player/:playerId/stats', nbaLimiter, validateRequest(playerStatsSchema), async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season } = req.query;

    const response = await axios.get(`${NBA_API_BASE}/players/${playerId}/stats`, {
      params: {
        season,
        api_key: NBA_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    const apiError = error as APIError;
    console.error('Error fetching player stats:', apiError);
    res.status(500).json({ 
      message: apiError.message || 'Failed to fetch player stats'
    });
  }
});

// Get player comparison
router.get('/compare', nbaLimiter, async (req, res) => {
  try {
    const { player1Id, player2Id, season } = req.query;

    const [player1Stats, player2Stats] = await Promise.all([
      axios.get(`${NBA_API_BASE}/players/${player1Id}/stats`, {
        params: { season, api_key: NBA_API_KEY }
      }),
      axios.get(`${NBA_API_BASE}/players/${player2Id}/stats`, {
        params: { season, api_key: NBA_API_KEY }
      })
    ]);

    res.json({
      player1: player1Stats.data,
      player2: player2Stats.data
    });
  } catch (error) {
    const apiError = error as APIError;
    console.error('Error comparing players:', apiError);
    res.status(500).json({ 
      message: apiError.message || 'Failed to compare players'
    });
  }
});

// Get team stats
router.get('/team/:teamId/stats', nbaLimiter, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { season } = req.query;

    const response = await axios.get(`${NBA_API_BASE}/teams/${teamId}/stats`, {
      params: {
        season,
        api_key: NBA_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    const apiError = error as APIError;
    console.error('Error fetching team stats:', apiError);
    res.status(500).json({ 
      message: apiError.message || 'Failed to fetch team stats'
    });
  }
});

export default router; 