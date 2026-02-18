// Raw BallDontLie stats shape (what /api/players/:id/stats returns)
export interface RawPlayerStats {
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  fg_pct: number;
  ft_pct: number;
  fg3_pct: number;
}

export interface StatAdvantage {
  label: string;
  team1Value: number;
  team2Value: number;
  winner: 1 | 2 | 'tie';
  higherIsBetter: boolean;
}

export interface PredictionResult {
  team1WinProbability: number; // 0–100
  projectedScore1: number;
  projectedScore2: number;
  pointSpread: number; // positive = team1 favored
  confidence: 'low' | 'medium' | 'high';
  advantages: StatAdvantage[];
}

function computeStrength(s: RawPlayerStats): number {
  return (
    s.pts * 1.0 +
    s.ast * 1.5 +
    s.reb * 0.8 +
    s.stl * 2.5 +
    s.blk * 2.0 +
    s.fg_pct * 20 +
    s.ft_pct * 5 -
    s.turnover * 2.0
  );
}

export function predictGame(
  stats1: RawPlayerStats,
  stats2: RawPlayerStats,
  homeTeam: 1 | 2 | null,
): PredictionResult {
  const s1 = computeStrength(stats1);
  const s2 = computeStrength(stats2);
  const homeBonus = homeTeam === 1 ? 3.5 : homeTeam === 2 ? -3.5 : 0;
  const spread = Math.max(-25, Math.min(25, (s1 - s2) * 0.15 + homeBonus));
  const winProb = (1 / (1 + Math.exp(-0.2 * spread))) * 100;
  const base = 110;

  const advantages: StatAdvantage[] = [
    { label: 'Points/Game', team1Value: stats1.pts, team2Value: stats2.pts, higherIsBetter: true },
    { label: 'Rebounds', team1Value: stats1.reb, team2Value: stats2.reb, higherIsBetter: true },
    { label: 'Assists', team1Value: stats1.ast, team2Value: stats2.ast, higherIsBetter: true },
    {
      label: 'FG%',
      team1Value: +(stats1.fg_pct * 100).toFixed(1),
      team2Value: +(stats2.fg_pct * 100).toFixed(1),
      higherIsBetter: true,
    },
    {
      label: 'Stl + Blk',
      team1Value: +(stats1.stl + stats1.blk).toFixed(1),
      team2Value: +(stats2.stl + stats2.blk).toFixed(1),
      higherIsBetter: true,
    },
    { label: 'Turnovers', team1Value: stats1.turnover, team2Value: stats2.turnover, higherIsBetter: false },
  ].map(a => ({
    ...a,
    winner: (
      a.higherIsBetter
        ? a.team1Value > a.team2Value
          ? 1
          : a.team2Value > a.team1Value
            ? 2
            : 'tie'
        : a.team1Value < a.team2Value
          ? 1
          : a.team2Value < a.team1Value
            ? 2
            : 'tie'
    ) as 1 | 2 | 'tie',
  }));

  const strengthDiff = Math.abs(s1 - s2);
  const confidence: 'low' | 'medium' | 'high' =
    strengthDiff > 10 ? 'high' : strengthDiff > 5 ? 'medium' : 'low';

  return {
    team1WinProbability: winProb,
    projectedScore1: Math.round(base + spread / 2),
    projectedScore2: Math.round(base - spread / 2),
    pointSpread: spread,
    confidence,
    advantages,
  };
}
