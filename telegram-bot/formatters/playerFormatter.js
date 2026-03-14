/**
 * Format player stats/research data for Telegram.
 */

function escMd(text) {
  if (!text) return '';
  return String(text).replace(/[_*`\[]/g, '');
}

export function formatPlayerResponse(data) {
  const ctx = data.statContext || {};

  let msg = `\u{1F3C0} *${data.playerName}*\n\n`;

  // Season averages
  const ppg = ctx.ppg ?? ctx.PPG;
  const apg = ctx.apg ?? ctx.APG;
  const rpg = ctx.rpg ?? ctx.RPG;

  msg += '*Season Averages*\n';
  msg += `PPG: ${ppg != null ? (typeof ppg === 'number' ? ppg.toFixed(1) : ppg) : 'N/A'} | `;
  msg += `APG: ${apg != null ? (typeof apg === 'number' ? apg.toFixed(1) : apg) : 'N/A'} | `;
  msg += `RPG: ${rpg != null ? (typeof rpg === 'number' ? rpg.toFixed(1) : rpg) : 'N/A'}\n\n`;

  // Recent form
  if (ctx.recentAvg5 != null) {
    msg += '*Recent Form (PTS)*\n';
    msg += `L5 Avg: ${ctx.recentAvg5.toFixed(1)} | L10 Avg: ${(ctx.recentAvg10 ?? 0).toFixed(1)}\n`;
    if (ctx.recentGames?.length) {
      msg += `Last 5: ${ctx.recentGames.slice(0, 5).join(' \u00B7 ')}\n`;
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
