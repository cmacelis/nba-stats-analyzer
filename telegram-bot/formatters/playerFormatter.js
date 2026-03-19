/**
 * Format player stats/research data for Telegram.
 */

function escMd(text) {
  if (!text) return '';
  return String(text).replace(/[_*`\[]/g, '');
}

export function formatPlayerResponse(data, statType = 'points') {
  const ctx = data.statContext || {};

  let msg = `\u{1F3C0} *${data.playerName}* (${statType.toUpperCase()})\n\n`;

  // Map stat type to context field
  const statMap = {
    points: { field: ctx.ppg ?? ctx.PPG, label: 'PPG' },
    assists: { field: ctx.apg ?? ctx.APG, label: 'APG' },
    rebounds: { field: ctx.rpg ?? ctx.RPG, label: 'RPG' },
    steals: { field: ctx.spg ?? ctx.SPG, label: 'SPG' },
    blocks: { field: ctx.bpg ?? ctx.BPG, label: 'BPG' },
    turnovers: { field: ctx.tov ?? ctx.TOV, label: 'TOV' },
    fg_pct: { field: ctx.fg_pct ?? ctx.FG_PCT, label: 'FG%' },
    three_pct: { field: ctx.three_pct ?? ctx.THREE_PCT, label: '3P%' },
    ft_pct: { field: ctx.ft_pct ?? ctx.FT_PCT, label: 'FT%' }
  };

  // Get the requested stat
  const requestedStat = statMap[statType] || statMap.points;
  const statValue = requestedStat.field;
  
  // Format the value
  const formatStat = (value, type) => {
    if (value == null) return 'N/A';
    if (typeof value === 'number') {
      if (type.includes('_pct') || type === 'fg_pct' || type === 'three_pct' || type === 'ft_pct') {
        return (value * 100).toFixed(1) + '%';
      }
      return value.toFixed(1);
    }
    return value;
  };

  msg += '*Season Average*\n';
  msg += `${requestedStat.label}: ${formatStat(statValue, statType)}\n\n`;

  // Also show other key stats for context
  const ppg = ctx.ppg ?? ctx.PPG;
  const apg = ctx.apg ?? ctx.APG;
  const rpg = ctx.rpg ?? ctx.RPG;
  
  if (statType !== 'points' && ppg != null) {
    msg += '*Other Key Stats*\n';
    msg += `PPG: ${typeof ppg === 'number' ? ppg.toFixed(1) : ppg} | `;
    msg += `APG: ${apg != null ? (typeof apg === 'number' ? apg.toFixed(1) : apg) : 'N/A'} | `;
    msg += `RPG: ${rpg != null ? (typeof rpg === 'number' ? rpg.toFixed(1) : rpg) : 'N/A'}\n\n`;
  }

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
