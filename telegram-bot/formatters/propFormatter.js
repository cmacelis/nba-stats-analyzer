/**
 * Format prop analysis data for Telegram Markdown.
 */

// Escape chars that break Telegram Markdown (v1) inside italic/bold
function escMd(text) {
  if (!text) return '';
  return String(text).replace(/[_*`\[]/g, '');
}

export function formatPropResponse(data, parsed, remaining) {
  const ctx = data.statContext || {};
  const dir = parsed.direction?.toUpperCase();
  const emoji = dir === 'OVER' ? '\u{1F525}' : dir === 'UNDER' ? '\u{1F9CA}' : '\u{1F3AF}';

  let msg = `${emoji} *${data.playerName}* \u2014 ${parsed.statType.toUpperCase()}`;
  if (dir) msg += ` ${dir}`;
  msg += '\n\n';

  if (ctx.propLine) {
    msg += `*Line:* ${ctx.propLine} (${ctx.lineSource || 'est.'})\n`;
  }
  if (parsed.line && parsed.line !== ctx.propLine) {
    msg += `*Your Target:* ${parsed.line}\n`;
  }

  const l5 = ctx.recentAvg5;
  const l10 = ctx.recentAvg10;
  msg += `*L5 Avg:* ${l5 != null ? l5.toFixed(1) : 'N/A'}\n`;
  msg += `*L10 Avg:* ${l10 != null ? l10.toFixed(1) : 'N/A'}\n`;

  if (ctx.ppg != null || ctx.PPG != null) {
    const ppg = ctx.ppg ?? ctx.PPG;
    msg += `*Season Avg:* ${typeof ppg === 'number' ? ppg.toFixed(1) : ppg}\n`;
  }

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
