from flask import Blueprint, jsonify, request
import requests
from config import Config
from utils.api_helpers import get_nba_headers, rate_limit, handle_nba_response
from utils.validators import require_params, validate_season_format

bp = Blueprint('nba_stats', __name__, url_prefix='/api/nba')

@bp.route('/player/<player_id>/stats', methods=['GET'])
@rate_limit(calls_per_second=1)
def get_player_stats(player_id):
    try:
        season = request.args.get('season', '2023-24')
        if not validate_season_format(season):
            return jsonify({'error': 'Invalid season format. Use YYYY-YY format (e.g., 2023-24)'}), 400

        params = {
            'PlayerID': player_id,
            'PerMode': 'PerGame',
            'Season': season,
            'SeasonType': 'Regular Season'
        }
        
        response = requests.get(
            Config.PLAYER_STATS_ENDPOINT,
            headers=get_nba_headers(),
            params=params,
            timeout=10
        )
        
        return handle_nba_response(response)
            
    except requests.Timeout:
        return jsonify({'error': 'Request timed out'}), 504
    except requests.RequestException as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@bp.route('/player/search', methods=['GET'])
@rate_limit(calls_per_second=1)
@require_params('name')
def search_players():
    try:
        name = request.args.get('name')
        season = request.args.get('season', '2023-24')

        if not validate_season_format(season):
            return jsonify({'error': 'Invalid season format. Use YYYY-YY format (e.g., 2023-24)'}), 400

        params = {
            'PlayerID': 0,
            'Season': season,
            'SeasonType': 'Regular Season'
        }
        
        response = requests.get(
            Config.PLAYER_STATS_ENDPOINT,
            headers=get_nba_headers(),
            params=params,
            timeout=10
        )
        
        data = handle_nba_response(response)
        if isinstance(data, tuple):  # Error response
            return data
            
        # Filter players by name
        players = []
        for player in data.get('leaguedashplayerstats', []):
            if name.lower() in player.get('player_name', '').lower():
                players.append({
                    'id': player.get('player_id'),
                    'name': player.get('player_name'),
                    'team': player.get('team_abbreviation'),
                    'position': player.get('pos')
                })
        
        return jsonify(players)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500 