import { Player } from '../types/nba';

export const MOCK_PLAYERS: Player[] = [
  // ... existing players
  {
    id: '6',
    fullName: 'Joel Embiid',
    team: 'PHI',
    position: 'C',
    stats: {
      points: 35.1,
      assists: 5.9,
      rebounds: 11.8,
      steals: 1.1,
      blocks: 1.9,
      fieldGoalPercentage: 53.7,
      threePointPercentage: 35.2,
      freeThrowPercentage: 88.5,
      minutesPerGame: 34.2,
      gamesPlayed: 34,
      plusMinus: 8.4,
      efficiency: 39.2
    }
  },
  {
    id: '7',
    fullName: 'Nikola Jokic',
    team: 'DEN',
    position: 'C',
    stats: {
      points: 26.3,
      assists: 9.2,
      rebounds: 12.1,
      steals: 1.2,
      blocks: 0.8,
      fieldGoalPercentage: 58.3,
      threePointPercentage: 34.8,
      freeThrowPercentage: 82.1,
      minutesPerGame: 33.6,
      gamesPlayed: 41,
      plusMinus: 9.2,
      efficiency: 42.5
    }
  }
]; 