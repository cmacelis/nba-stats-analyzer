/**
 * Format daily edge briefing for Telegram.
 */

export function formatBriefing(edges, stat) {
  const label = stat === 'pra' ? 'PRA' : 'PTS';
  const dateStr = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  let msg = `\u{1F4CA} *Daily Edge Briefing* \u2014 ${dateStr}\n\n`;

  const top = edges.slice(0, 5);
  if (top.length === 0) {
    msg += '_No edges found for today. Check back later._\n';
    return msg;
  }

  top.forEach((e, i) => {
    const sign = e.delta >= 0 ? '+' : '';
    const dir = e.delta >= 0 ? 'OVER' : 'UNDER';
    const emoji = e.delta >= 0 ? '\u{1F525}' : '\u{1F9CA}';

    msg += `${i + 1}. ${emoji} *${e.player_name}* (${e.team_abbrev})\n`;
    msg += `   ${label} ${dir} | L5: ${e.recent_avg.toFixed(1)} | \u0394: ${sign}${e.delta.toFixed(1)}`;
    if (e.prop_line) msg += ` | Line: ${e.prop_line}`;
    msg += '\n';
    if (e.last5) {
      msg += `   Last 5: ${e.last5.join(' \u00B7 ')}\n`;
    }
    msg += '\n';
  });

  msg += `_View full edge feed: edgedetector.ai/edge_`;
  return msg;
}
