/**
 * predict.ts handler — GET /api/predict?p1=<id>&p2=<id>&home=<1|2>&season=2025
 * Server-side 5-factor game prediction using BDL GOAT data.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  BDL_SEASON,
  bdlGet,
  getStandings,
  getPlayerAdvancedStats,
  getRecentForm,
  getBatchSeasonAverages,
  type StandingRecord,
  type AdvancedStats,
  type RecentForm,
} from '../_lib.js';

// ── Types ────────────────────────────────────────────────────────────────────

interface FactorEdge {
  team1: number | string;
  team2: number | string;
  edge:  1 | 2 | 'tie';
}

interface PredictionResponse {
  team1WinProbability: number;
  projectedScore1:     number;
  projectedScore2:     number;
  pointSpread:         number;
  confidence:          'low' | 'medium' | 'high';
  factors: {
    teamRecord:     FactorEdge;
    starNetRating:  FactorEdge;
    homeCourt:      { team: string | null; bonus: number };
    recentForm:     FactorEdge;
    starEfficiency: FactorEdge;
  };
  advantages: Array<{
    label:        string;
    team1Value:   number;
    team2Value:   number;
    winner:       1 | 2 | 'tie';
    higherIsBetter: boolean;
  }>;
  pace:       { team1: number; team2: number };
  dataSource: 'server';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function edge(a: number, b: number): 1 | 2 | 'tie' {
  if (a > b) return 1;
  if (b > a) return 2;
  return 'tie';
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function predictHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const p1Id  = parseInt(req.query.p1 as string);
    const p2Id  = parseInt(req.query.p2 as string);
    const home  = req.query.home ? parseInt(req.query.home as string) as 1 | 2 : null;
    const season = parseInt(req.query.season as string) || BDL_SEASON;

    if (!p1Id || !p2Id || isNaN(p1Id) || isNaN(p2Id)) {
      return res.status(400).json({ error: 'p1 and p2 (player IDs) are required' });
    }

    // ── Fetch all data in parallel ──────────────────────────────────────────

    const [
      standings,
      advancedMap,
      seasonAvgMap,
      form1,
      form2,
      player1Data,
      player2Data,
    ] = await Promise.all([
      getStandings(season),
      getPlayerAdvancedStats([p1Id, p2Id], season),
      getBatchSeasonAverages([p1Id, p2Id], season),
      getRecentForm(p1Id, season),
      getRecentForm(p2Id, season),
      bdlGet('/players/' + p1Id).then(r => r?.data ?? r).catch(() => null),
      bdlGet('/players/' + p2Id).then(r => r?.data ?? r).catch(() => null),
    ]);

    const team1Id = player1Data?.team?.id;
    const team2Id = player2Data?.team?.id;
    const team1Abbr = player1Data?.team?.abbreviation ?? '???';
    const team2Abbr = player2Data?.team?.abbreviation ?? '???';

    if (!team1Id || !team2Id) {
      return res.status(400).json({ error: 'Could not determine team for one or both players' });
    }

    const stand1: StandingRecord | undefined = standings.get(team1Id);
    const stand2: StandingRecord | undefined = standings.get(team2Id);
    const adv1:   AdvancedStats  | undefined = advancedMap.get(p1Id);
    const adv2:   AdvancedStats  | undefined = advancedMap.get(p2Id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savg1:  Record<string, any> | undefined = seasonAvgMap.get(p1Id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savg2:  Record<string, any> | undefined = seasonAvgMap.get(p2Id);

    // ── Factor 1: Team Record (35%) ─────────────────────────────────────────

    let recordScore = 0;
    const hasStandings = !!stand1 && !!stand2;
    if (hasStandings) {
      // Use home/road-specific win% when home court is known
      let wpct1: number, wpct2: number;
      if (home === 1) {
        // team1 is home, team2 is away
        const h1Total = stand1.home_wins + stand1.home_losses;
        const r2Total = stand2.road_wins + stand2.road_losses;
        wpct1 = h1Total > 0 ? stand1.home_wins / h1Total : stand1.win_pct;
        wpct2 = r2Total > 0 ? stand2.road_wins / r2Total : stand2.win_pct;
      } else if (home === 2) {
        // team2 is home, team1 is away
        const r1Total = stand1.road_wins + stand1.road_losses;
        const h2Total = stand2.home_wins + stand2.home_losses;
        wpct1 = r1Total > 0 ? stand1.road_wins / r1Total : stand1.win_pct;
        wpct2 = h2Total > 0 ? stand2.home_wins / h2Total : stand2.win_pct;
      } else {
        // neutral
        wpct1 = stand1.win_pct;
        wpct2 = stand2.win_pct;
      }
      recordScore = (wpct1 - wpct2) * 20;
    }

    // ── Factor 2: Star Net Rating (20%) ─────────────────────────────────────

    let netRatingScore = 0;
    const hasAdvanced = !!adv1 && !!adv2;
    if (hasAdvanced) {
      netRatingScore = (adv1.net_rating - adv2.net_rating) * 0.8;
    }

    // ── Factor 3: Home Court (15%) ──────────────────────────────────────────

    let homeBonus = 0;
    let homeTeamAbbr: string | null = null;
    if (home === 1 && stand1) {
      const hTotal = stand1.home_wins + stand1.home_losses;
      const homeWpct = hTotal > 0 ? stand1.home_wins / hTotal : 0.5;
      homeBonus = (homeWpct - 0.5) * 10;
      homeTeamAbbr = team1Abbr;
    } else if (home === 2 && stand2) {
      const hTotal = stand2.home_wins + stand2.home_losses;
      const homeWpct = hTotal > 0 ? stand2.home_wins / hTotal : 0.5;
      homeBonus = -((homeWpct - 0.5) * 10);
      homeTeamAbbr = team2Abbr;
    }

    // ── Factor 4: Recent Form (15%) ─────────────────────────────────────────

    let formScore = 0;
    const hasForm = !!form1 && !!form2;
    if (hasForm && savg1 && savg2) {
      const p1SeasonPts = savg1.pts ?? 0;
      const p2SeasonPts = savg2.pts ?? 0;
      const p1Trend = form1.recentPts - p1SeasonPts;
      const p2Trend = form2.recentPts - p2SeasonPts;
      formScore = (p1Trend - p2Trend) * 0.5;
    }

    // ── Factor 5: Star Efficiency (15%) ─────────────────────────────────────

    let effScore = 0;
    if (hasAdvanced) {
      const p1Eff = adv1.ts_pct * adv1.usg_pct;
      const p2Eff = adv2.ts_pct * adv2.usg_pct;
      effScore = (p1Eff - p2Eff) * 30;
    }

    // ── Redistribute weights if data is missing ─────────────────────────────

    let w = { record: 0.35, netRating: 0.20, home: 0.15, form: 0.15, eff: 0.15 };
    const missing: string[] = [];
    if (!hasStandings)  missing.push('record');
    if (!hasAdvanced)   { missing.push('netRating'); missing.push('eff'); }
    if (!hasForm)       missing.push('form');

    if (missing.length > 0) {
      const totalMissing = missing.reduce((s, k) => s + w[k as keyof typeof w], 0);
      const active = Object.keys(w).filter(k => !missing.includes(k)) as (keyof typeof w)[];
      if (active.length > 0) {
        const redistPer = totalMissing / active.length;
        const newW = { ...w };
        for (const k of missing) newW[k as keyof typeof w] = 0;
        for (const k of active) newW[k] += redistPer;
        w = newW;
      }
    }

    // ── Combine ─────────────────────────────────────────────────────────────

    const rawSpread =
      recordScore    * w.record +
      netRatingScore * w.netRating +
      homeBonus      * w.home +
      formScore      * w.form +
      effScore       * w.eff;

    const spread = clamp(rawSpread, -25, 25);
    const winProb = sigmoid(spread * 0.2) * 100;

    // ── Pace-adjusted projected scores ──────────────────────────────────────

    const pace1 = adv1?.pace ?? 100;
    const pace2 = adv2?.pace ?? 100;
    const avgPace = (pace1 + pace2) / 2;
    const AVG_PPP = 1.12; // league avg points per possession 2025-26
    const baseScore = Math.round(avgPace * AVG_PPP);

    const projectedScore1 = Math.round(baseScore + spread / 2);
    const projectedScore2 = Math.round(baseScore - spread / 2);

    // ── Confidence ──────────────────────────────────────────────────────────

    const gp1 = (stand1?.wins ?? 0) + (stand1?.losses ?? 0);
    const gp2 = (stand2?.wins ?? 0) + (stand2?.losses ?? 0);
    const absSpread = Math.abs(spread);

    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (absSpread > 8 && gp1 > 40 && gp2 > 40) confidence = 'high';
    else if (absSpread > 4) confidence = 'medium';

    // ── Build stat advantages (for table) ───────────────────────────────────

    const pts1 = savg1?.pts ?? 0, pts2 = savg2?.pts ?? 0;
    const reb1 = savg1?.reb ?? 0, reb2 = savg2?.reb ?? 0;
    const ast1 = savg1?.ast ?? 0, ast2 = savg2?.ast ?? 0;
    const fgPct1 = r1((savg1?.fg_pct ?? 0) * 100), fgPct2 = r1((savg2?.fg_pct ?? 0) * 100);
    const stlBlk1 = r1((savg1?.stl ?? 0) + (savg1?.blk ?? 0));
    const stlBlk2 = r1((savg2?.stl ?? 0) + (savg2?.blk ?? 0));
    const tov1 = savg1?.turnover ?? 0, tov2 = savg2?.turnover ?? 0;

    function adv(label: string, v1: number, v2: number, higherIsBetter: boolean) {
      const w = higherIsBetter
        ? (v1 > v2 ? 1 : v2 > v1 ? 2 : 'tie')
        : (v1 < v2 ? 1 : v2 < v1 ? 2 : 'tie');
      return { label, team1Value: r1(v1), team2Value: r1(v2), winner: w as 1 | 2 | 'tie', higherIsBetter };
    }

    const advantages = [
      adv('Points/Game', pts1, pts2, true),
      adv('Rebounds', reb1, reb2, true),
      adv('Assists', ast1, ast2, true),
      adv('FG%', fgPct1, fgPct2, true),
      adv('Stl + Blk', stlBlk1, stlBlk2, true),
      adv('Turnovers', tov1, tov2, false),
    ];

    // Add advanced stats rows if available
    if (hasAdvanced) {
      advantages.push(
        adv('Net Rating', r1(adv1.net_rating), r1(adv2.net_rating), true),
        adv('True Shooting %', r1(adv1.ts_pct * 100), r1(adv2.ts_pct * 100), true),
      );
    }

    // ── Response ────────────────────────────────────────────────────────────

    const response: PredictionResponse = {
      team1WinProbability: r1(winProb),
      projectedScore1,
      projectedScore2,
      pointSpread: r1(spread),
      confidence,
      factors: {
        teamRecord: {
          team1: stand1 ? `${stand1.wins}-${stand1.losses}` : 'N/A',
          team2: stand2 ? `${stand2.wins}-${stand2.losses}` : 'N/A',
          edge: hasStandings ? edge(stand1!.win_pct, stand2!.win_pct) : 'tie',
        },
        starNetRating: {
          team1: adv1?.net_rating ?? 0,
          team2: adv2?.net_rating ?? 0,
          edge: hasAdvanced ? edge(adv1!.net_rating, adv2!.net_rating) : 'tie',
        },
        homeCourt: {
          team: homeTeamAbbr,
          bonus: r1(homeBonus),
        },
        recentForm: {
          team1: form1?.recentPts ?? 0,
          team2: form2?.recentPts ?? 0,
          edge: hasForm ? edge(form1!.recentPts, form2!.recentPts) : 'tie',
        },
        starEfficiency: {
          team1: adv1 ? r1(adv1.ts_pct * adv1.usg_pct * 100) : 0,
          team2: adv2 ? r1(adv2.ts_pct * adv2.usg_pct * 100) : 0,
          edge: hasAdvanced ? edge(adv1!.ts_pct * adv1!.usg_pct, adv2!.ts_pct * adv2!.usg_pct) : 'tie',
        },
      },
      advantages,
      pace: { team1: pace1, team2: pace2 },
      dataSource: 'server',
    };

    return res.json(response);
  } catch (err) {
    console.error('[predict] error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Prediction failed', detail: String(err) });
    }
  }
}
