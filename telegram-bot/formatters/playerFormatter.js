/**
 * Format player stats/research data for Telegram.
 *
 * The backend StatContext shape is:
 *   { propLine, recentAvg5, recentAvg10, stdDev, overHitRate, streak, recentGames, gamesPlayed }
 * It does NOT contain named fields like ppg/apg/rpg — propLine IS the season
 * average for whatever stat was requested.
 */

function escMd(text) {
  if (!text) return '';
  return String(text).replace(/[_*`\[]/g, '');
}

// Human-readable labels (no underscores — safe for Telegram Markdown v1)
const STAT_LABELS = {
  points: 'PPG', assists: 'APG', rebounds: 'RPG',
  steals: 'SPG', blocks: 'BPG', turnovers: 'TOV',
  fg_pct: 'FG%', three_pct: '3P%', ft_pct: 'FT%',
};

export function formatPlayerResponse(data, statType = 'points') {
  const ctx = data.statContext || {};
  const label = STAT_LABELS[statType] || statType.replace(/_/g, ' ').toUpperCase();
  const isPct = statType.includes('_pct');

  // Format helper — percentages stored as decimals (0.456 → 45.6%)
  // Defensive: if value > 1 it's already in percentage scale (or wrong data);
  // only multiply by 100 when value is in 0-1 decimal range.
  const fmtVal = (v) => {
    if (v == null) return 'N/A';
    if (typeof v !== 'number') return String(v);
    if (isPct) {
      const pct = v <= 1 ? v * 100 : v;
      return pct.toFixed(1) + '%';
    }
    return v.toFixed(1);
  };

  let msg = `\u{1F3C0} *${escMd(data.playerName)}* (${label})\n\n`;

  // Season average — propLine IS the season avg for the requested stat
  msg += '*Season Average*\n';
  msg += `${label}: ${fmtVal(ctx.propLine)}\n\n`;

  // Recent form
  if (ctx.recentAvg5 != null) {
    msg += `*Recent Form (${label})*\n`;
    msg += `L5 Avg: ${fmtVal(ctx.recentAvg5)} | L10 Avg: ${fmtVal(ctx.recentAvg10 ?? 0)}\n`;
    if (ctx.recentGames?.length) {
      msg += `Last 5: ${ctx.recentGames.slice(0, 5).map(fmtVal).join(' \u00B7 ')}\n`;
    }
    if (ctx.overHitRate != null) {
      msg += `Over Hit Rate: ${Math.round(ctx.overHitRate * 100)}% (L10)\n`;
    }
    msg += '\n';
  }

  // Prediction
  if (data.prediction) {
    const pred = data.prediction.toUpperCase();
    const conf = ((data.confidence || 0.5) * 100).toFixed(0);
    const emoji = pred === 'OVER' ? '\u2705' : pred === 'UNDER' ? '\u{1F534}' : '\u26AA';
    msg += `${emoji} *Prediction:* ${pred} (${conf}%)\n`;
    if (data.reasoning) {
      msg += `_${escMd(data.reasoning)}_\n`;
    }
  }

  return msg;
}
