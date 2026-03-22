#!/usr/bin/env node

/**
 * Generate today's NBA picks using production API
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const API_BASE = 'https://nba-stats-analyzer-chuers-projects.vercel.app';
const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

async function generatePicks() {
  console.log(`🏀 Generating NBA picks for ${TODAY}...`);
  
  try {
    // Get edge data from production API
    const response = await fetch(`${API_BASE}/api/edge`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Retrieved ${data.data.length} player edges`);
    
    // Filter for significant edges (delta > 2.0 or < -2.0)
    const significantEdges = data.data.filter(player => {
      return Math.abs(player.delta) >= 2.0;
    });
    
    console.log(`📊 Found ${significantEdges.length} significant edges`);
    
    if (significantEdges.length === 0) {
      console.log('⚠️ No significant edges found. Using top 2 edges by absolute delta.');
      // Sort by absolute delta and take top 2
      significantEdges.push(...data.data
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 2));
    }
    
    // Sort by delta magnitude (descending)
    const sortedEdges = [...significantEdges].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    
    // Take top 2 as picks
    const picks = sortedEdges.slice(0, 2).map((player, index) => {
      const isOver = player.delta > 0;
      const confidence = Math.abs(player.delta) >= 3.0 ? 'High' : 
                        Math.abs(player.delta) >= 2.0 ? 'Moderate' : 'Low';
      
      return {
        rank: index === 0 ? 'PICK OF THE DAY' : 'RUNNER-UP',
        player: player.player_name,
        team: player.team_abbrev,
        prop: `${isOver ? 'OVER' : 'UNDER'} ${player.season_avg + (isOver ? 1.5 : -1.5)} points`,
        edgeType: isOver ? 'Momentum continuation' : 'Statistical regression',
        seasonAvg: player.season_avg,
        recentAvg: player.recent_avg,
        delta: player.delta,
        confidence,
        units: confidence === 'High' ? '1.5u' : '1u',
        reasoning: `${player.player_name} has ${isOver ? 'outperformed' : 'underperformed'} their season average (${player.season_avg} PPG) with a recent average of ${player.recent_avg} PPG (${player.delta > 0 ? '+' : ''}${player.delta.toFixed(1)} delta). The prop line appears ${isOver ? 'undervalued' : 'overvalued'} given this trend.`
      };
    });
    
    // Create picks file
    const picksContent = `# NBA Picks - ${TODAY}

## 📊 Current Record: 4-5-0 (44.4%) | Units: -1.36u

---

${picks.map(pick => `### 🎯 ${pick.rank}
**${pick.player} (${pick.team}) — ${pick.prop}** | -110
**Edge Type:** ${pick.edgeType}
- Season avg: ${pick.seasonAvg} | Recent avg: ${pick.recentAvg} (${pick.delta > 0 ? '+' : ''}${pick.delta.toFixed(1)} delta)
- Last 5 games: [check game logs]
- Prop line ${pick.delta > 0 ? 'undervalued' : 'overvalued'} vs recent performance
- **Confidence:** ${pick.confidence} (${pick.units})

${pick.reasoning}

---`).join('\n\n')}

### 📈 Statistical Backing
- Based on NBA Stats Analyzer edge detection API (production)
- Season vs recent average comparison (5-game window)
- Clear statistical trends identified
- 2-pick maximum for discipline

### ⚠️ Risk Management
- Monitor injury reports before game time
- Watch for lineup changes affecting minutes
- ${picks[0].confidence === 'High' ? 'High-confidence pick today' : 'Moderate-confidence picks today'}

*For entertainment purposes only. Gamble responsibly.*

---

**Generated:** ${new Date().toISOString()}
**API Source:** ${API_BASE}/api/edge
**Data:** ${data.stat} for ${data.season} season`;

    // Write to file
    const picksDir = join(process.cwd(), 'picks');
    const filePath = join(picksDir, `${TODAY}.md`);
    
    if (!existsSync(picksDir)) {
      mkdirSync(picksDir, { recursive: true });
    }
    
    writeFileSync(filePath, picksContent);
    console.log(`✅ Picks written to: ${filePath}`);
    
    // Also create a simple summary
    const summary = {
      date: TODAY,
      picks: picks.map(p => ({
        player: p.player,
        prop: p.prop,
        confidence: p.confidence,
        units: p.units
      })),
      generated_at: new Date().toISOString()
    };
    
    const summaryPath = join(picksDir, `${TODAY}_summary.json`);
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Summary written to: ${summaryPath}`);
    
    return { picks, filePath };
    
  } catch (error) {
    console.error(`❌ Error generating picks: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generatePicks().then(result => {
    console.log('\n🎯 Today\'s Picks:');
    result.picks.forEach(pick => {
      console.log(`\n${pick.rank}: ${pick.player} - ${pick.prop} (${pick.confidence})`);
    });
    console.log(`\n📁 File: ${result.filePath}`);
  });
}

export { generatePicks };