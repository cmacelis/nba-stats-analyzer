import os
from dotenv import load_dotenv
from nba_api.stats.static import players
from nba_api.stats.endpoints import playergamelog

# Load your .env headers to bypass blocking
load_dotenv()
HEADERS = {
    'User-Agent': os.getenv('NBA_USER_AGENT'),
    'Referer': os.getenv('NBA_REFERER')
}

def get_player_avg(player_name):
    print(f"🏀 Searching for {player_name}...")
    
    # 1. Find the player ID
    nba_players = players.find_players_by_full_name(player_name)
    if not nba_players:
        return "Player not found."
    
    pid = nba_players[0]['id']
    
    # 2. Fetch their game log for the current season
    log = playergamelog.PlayerGameLog(player_id=pid, headers=HEADERS)
    df = log.get_data_frames()[0]
    
    # 3. Calculate average of last 5 games
    last_5 = df.head(5)
    avg_pts = last_5['PTS'].mean()
    
    return f"🔥 {player_name} is averaging {avg_pts:.1f} PPG over his last 5 games."

def find_scoring_edge(player_name):
    print(f"🔍 Analyzing value for {player_name}...")
    
    # 1. Get Player Data
    p_results = players.find_players_by_full_name(player_name)
    if not p_results:
        return {"error": "Player not found"}
        
    p_info = p_results[0]
    log = playergamelog.PlayerGameLog(player_id=p_info['id'], headers=HEADERS)
    df = log.get_data_frames()[0]

    # 2. Calculate Stats
    season_avg = df['PTS'].mean()
    last_5_avg = df.head(5)['PTS'].mean()
    
    # 3. Calculate the "Edge" Percentage
    diff = last_5_avg - season_avg
    edge_pct = (diff / season_avg) * 100

    status = "🔥 HOT" if edge_pct > 15 else "❄️ COLD" if edge_pct < -15 else "⚖️ STEADY"
    
    return {
        "player": player_name,
        "season_avg": round(season_avg, 1),
        "last_5_avg": round(last_5_avg, 1),
        "edge_pct": f"{edge_pct:+.1f}%",
        "status": status
    }

# This part only runs when you manually start the script
if __name__ == "__main__":
    print(get_player_avg("LeBron James"))
    print(find_scoring_edge("Anthony Edwards"))