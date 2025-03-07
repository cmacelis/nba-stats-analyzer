interface EmailTemplate {
  subject: string;
  generateHtml: (data: any) => string;
}

export const emailTemplates: Record<string, EmailTemplate> = {
  dailyDigest: {
    subject: 'Your NBA Daily Digest',
    generateHtml: (data: { 
      username: string; 
      news: any[]; 
      games: any[]; 
      playerUpdates: any[] 
    }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Daily NBA Updates for ${data.username}</h1>
        
        ${data.news.length > 0 ? `
          <h2>Latest News</h2>
          <ul>
            ${data.news.map(item => `
              <li>${item.title}</li>
            `).join('')}
          </ul>
        ` : ''}
        
        ${data.games.length > 0 ? `
          <h2>Game Results</h2>
          <ul>
            ${data.games.map(game => `
              <li>${game.homeTeam} ${game.homeScore} - ${game.awayScore} ${game.awayTeam}</li>
            `).join('')}
          </ul>
        ` : ''}
        
        ${data.playerUpdates.length > 0 ? `
          <h2>Player Updates</h2>
          <ul>
            ${data.playerUpdates.map(update => `
              <li>${update.playerName}: ${update.update}</li>
            `).join('')}
          </ul>
        ` : ''}
      </div>
    `
  },
  achievementUnlocked: {
    subject: 'Achievement Unlocked! 🏆',
    generateHtml: (data: { 
      username: string; 
      achievement: { 
        title: string; 
        description: string 
      } 
    }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
        <h1>Congratulations, ${data.username}! 🎉</h1>
        <h2>You've unlocked a new achievement:</h2>
        <div style="background-color: #f5f5f5; padding: 2rem; border-radius: 8px; margin: 2rem 0;">
          <h3 style="color: #1e3c72;">${data.achievement.title}</h3>
          <p>${data.achievement.description}</p>
        </div>
        <p>Keep up the great work! 💪</p>
      </div>
    `
  },
  weeklyNewsletter: {
    subject: 'Your NBA Weekly Newsletter 🏀',
    generateHtml: (data: {
      username: string;
      weeklyStats: any;
      topPlayers: any[];
      predictions: any[];
    }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Weekly NBA Insights for ${data.username}</h1>
        
        <div style="margin: 2rem 0;">
          <h2>This Week's Highlights</h2>
          <div style="background-color: #f5f5f5; padding: 1rem; border-radius: 8px;">
            <p>Games Played: ${data.weeklyStats.gamesPlayed}</p>
            <p>Average Points: ${data.weeklyStats.avgPoints}</p>
            <p>Highest Scoring Game: ${data.weeklyStats.highestScore}</p>
          </div>
        </div>

        <div style="margin: 2rem 0;">
          <h2>Top Performers</h2>
          <div style="display: grid; gap: 1rem;">
            ${data.topPlayers.map(player => `
              <div style="background-color: #f5f5f5; padding: 1rem; border-radius: 8px;">
                <h3>${player.name}</h3>
                <p>${player.stats}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin: 2rem 0;">
          <h2>Next Week's Predictions</h2>
          <ul style="list-style: none; padding: 0;">
            ${data.predictions.map(prediction => `
              <li style="margin-bottom: 1rem;">
                <strong>${prediction.teams}</strong>
                <p>${prediction.analysis}</p>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `
  },
  gameAlert: {
    subject: '🏀 Game Alert: {{teams}}',
    generateHtml: (data: {
      username: string;
      game: {
        homeTeam: string;
        awayTeam: string;
        time: string;
        venue: string;
        keyPlayers: string[];
      };
    }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Game Alert</h1>
        <div style="background-color: #f5f5f5; padding: 2rem; border-radius: 8px; margin: 2rem 0;">
          <h2>${data.game.homeTeam} vs ${data.game.awayTeam}</h2>
          <p>Time: ${data.game.time}</p>
          <p>Venue: ${data.game.venue}</p>
          
          <h3>Key Players to Watch:</h3>
          <ul>
            ${data.game.keyPlayers.map(player => `
              <li>${player}</li>
            `).join('')}
          </ul>
        </div>
        
        <p>Don't miss this exciting matchup!</p>
      </div>
    `
  }
}; 