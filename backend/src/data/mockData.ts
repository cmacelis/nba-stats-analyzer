import { Player, PlayerStats, ComparisonData } from '../types/player';

// Export the mock data
export const mockPlayers: Player[] = [
  { id: 1, name: 'LeBron James', team: 'Los Angeles Lakers' },
  { id: 2, name: 'Stephen Curry', team: 'Golden State Warriors' },
  { id: 3, name: 'Kevin Durant', team: 'Phoenix Suns' },
  { id: 4, name: 'Giannis Antetokounmpo', team: 'Milwaukee Bucks' },
  { id: 5, name: 'Joel Embiid', team: 'Philadelphia 76ers' },
  { id: 6, name: 'Luka Doncic', team: 'Dallas Mavericks' },
  { id: 7, name: 'Nikola Jokic', team: 'Denver Nuggets' },
  { id: 8, name: 'Jayson Tatum', team: 'Boston Celtics' },
  { id: 9, name: 'Devin Booker', team: 'Phoenix Suns' },
  { id: 10, name: 'Ja Morant', team: 'Memphis Grizzlies' },
];

export const mockPlayerStats: Record<number, PlayerStats> = {
  1: {
    points: 27.5,
    assists: 8.3,
    rebounds: 7.8,
    steals: 1.5,
    blocks: 0.8,
    turnovers: 3.2,
    fieldGoalPercentage: 52.5,
    threePointPercentage: 35.8,
    freeThrowPercentage: 73.5,
    gamesPlayed: 65,
    minutesPerGame: 35.5,
    plusMinus: 7.2,
    playerEfficiencyRating: 25.6,
  },
  2: {
    points: 29.8,
    assists: 6.2,
    rebounds: 5.4,
    steals: 1.3,
    blocks: 0.4,
    turnovers: 2.8,
    fieldGoalPercentage: 48.5,
    threePointPercentage: 42.3,
    freeThrowPercentage: 91.2,
    gamesPlayed: 58,
    minutesPerGame: 34.2,
    plusMinus: 8.5,
    playerEfficiencyRating: 24.8,
  },
  // Add more mock stats...
};

export const mockHeadToHead: Record<string, ComparisonData> = {
  '1-2': {
    matchups: 30,
    player1Wins: 16,
    player2Wins: 14,
    averagePointDiff: 3.2,
    headToHeadStats: {
      player1: {
        points: 28.5,
        assists: 8.1,
        rebounds: 7.4,
        steals: 1.3,
        blocks: 0.9,
        turnovers: 3.4,
        fieldGoalPercentage: 51.2,
        threePointPercentage: 34.8,
        freeThrowPercentage: 72.5,
        gamesPlayed: 30,
        minutesPerGame: 36.2,
        plusMinus: 5.8,
        playerEfficiencyRating: 24.9,
      },
      player2: {
        points: 27.8,
        assists: 6.5,
        rebounds: 5.2,
        steals: 1.4,
        blocks: 0.3,
        turnovers: 2.9,
        fieldGoalPercentage: 47.8,
        threePointPercentage: 41.5,
        freeThrowPercentage: 90.8,
        gamesPlayed: 30,
        minutesPerGame: 35.1,
        plusMinus: 6.2,
        playerEfficiencyRating: 23.7,
      }
    },
    lastMatchup: {
      date: '2024-01-15',
      winner: 1,
      player1Points: 32,
      player2Points: 29,
      gameId: 12345
    }
  },
  // Add more matchups...
}; 