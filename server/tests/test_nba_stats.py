import pytest
from unittest.mock import patch, MagicMock
from routes.nba_stats import bp

def test_get_player_stats(client):
    with patch('routes.nba_stats.requests.get') as mock_get:
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resultSets': [{
                'name': 'PlayerStats',
                'headers': ['PLAYER_ID', 'PLAYER_NAME', 'PTS'],
                'rowSet': [[1, 'Test Player', 25.5]]
            }]
        }
        mock_get.return_value = mock_response

        response = client.get('/api/nba/player/1/stats')
        assert response.status_code == 200
        data = response.get_json()
        assert 'playerstats' in data
        assert data['playerstats'][0]['player_name'] == 'Test Player'

def test_search_players(client):
    with patch('routes.nba_stats.requests.get') as mock_get:
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resultSets': [{
                'name': 'LeagueDashPlayerStats',
                'headers': ['PLAYER_ID', 'PLAYER_NAME', 'TEAM_ABBREVIATION', 'POS'],
                'rowSet': [
                    [1, 'Stephen Curry', 'GSW', 'G'],
                    [2, 'Seth Curry', 'BKN', 'G']
                ]
            }]
        }
        mock_get.return_value = mock_response

        # Test without name parameter
        response = client.get('/api/nba/player/search')
        assert response.status_code == 400
        assert b'Missing required parameters: name' in response.data

        # Test with invalid season
        response = client.get('/api/nba/player/search?name=curry&season=invalid')
        assert response.status_code == 400
        assert b'Invalid season format' in response.data

        # Test successful search
        response = client.get('/api/nba/player/search?name=curry')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 2
        assert data[0]['name'] == 'Stephen Curry'
        assert data[1]['name'] == 'Seth Curry' 