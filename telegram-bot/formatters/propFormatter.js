/**
 * Format prop analysis data for Telegram Markdown.
 *
 * The backend StatContext shape is:
 *   { propLine, recentAvg5, recentAvg10, stdDev, overHitRate, streak, recentGames, gamesPlayed }
 * propLine IS the season average for the requested stat.
 */

// Escape chars that break Telegram Markdown (v1) inside italic/bold
function escMd(text) {
  if (!text) return '';
  return String(text).replace(/[_*`\[]/g, '');
}

// Human-readable labels (no underscores — safe for Telegram Markdown v1)
const STAT_LABELS = {
  points: 'POINTS', assists: 'ASSISTS', rebounds: 'REBOUNDS',
  steals: 'STEALS', blocks: 'BLOCKS', turnovers: 'TURNOVERS',
  fg_pct: 'FG%', three_pct: '3P%', ft_pct: 'FT%',
  threes: 'THREES', pra: 'PRA',
};

export function formatPropResponse(data, parsed, remaining) {
  const ctx = data.statContext || {};
  const dir = parsed.direction?.toUpperCase();
  const emoji = dir === 'OVER' ? '\u{1F525}' : dir === 'UNDER' ? '\u{1F9CA}' : '\u{1F3AF}';
  const statLabel = STAT_LABELS[parsed.statType] || parsed.statType.replace(/_/g, ' ').toUpperCase();

  let msg = `${emoji} *${escMd(data.playerName)}* \u2014 ${statLabel}`;
  if (dir) msg += ` ${dir}`;
  msg += '\n\n';

  const isPct = parsed.statType?.includes('_pct');
  // Defensive: only multiply by 100 when value is in 0-1 decimal range.
  // If value > 1, it's already percentage-scale (or wrong data — don't amplify).
  const fmtVal = (v) => {
    if (v == null) return 'N/A';
    if (isPct) {
      const pct = v <= 1 ? v * 100 : v;
      return pct.toFixed(1) + '%';
    }
    return v.toFixed(1);
  };

  if (ctx.propLine != null) {
    msg += `*Season Avg:* ${fmtVal(ctx.propLine)}\n`;
  }
  if (parsed.line) {
    msg += `*Your Line:* ${parsed.line}\n`;
  }

  msg += `*L5 Avg:* ${fmtVal(ctx.recentAvg5)}\n`;
  msg += `*L10 Avg:* ${fmtVal(ctx.recentAvg10)}\n`;

  if (ctx.overHitRate != null) {
    msg += `*Over Hit Rate:* ${Math.round(ctx.overHitRate * 100)}% (L10)\n`;
  }

  if (ctx.streak) {
    const s = ctx.streak;
    msg += `*Streak:* ${s > 0 ? `${s} consecutive OVERs` : `${Math.abs(s)} consecutive UNDERs`}\n`;
  }

  if (ctx.stdDev != null) {
    msg += `*Std Dev:* ${ctx.stdDev.toFixed(1)}\n`;
  }

  msg += '\n';

  // Prediction
  const pred = data.prediction?.toUpperCase() || 'NEUTRAL';
  const conf = ((data.confidence || 0.5) * 100).toFixed(0);
  const predEmoji = pred === 'OVER' ? '\u2705' : pred === 'UNDER' ? '\u{1F534}' : '\u26AA';
  msg += `${predEmoji} *Prediction:* ${pred} (${conf}% confidence)\n`;

  if (data.reasoning) {
    msg += `_${escMd(data.reasoning)}_\n`;
  }

  msg += '\n';
  if (remaining !== Infinity) {
    msg += `\u{1F4CA} _${remaining} queries remaining today_`;
  } else {
    msg += `\u2B50 _Pro \u2014 unlimited queries_`;
  }

  return msg;
}
