import pytest
from utils.api_helpers import format_nba_data, handle_nba_response
from unittest.mock import MagicMock

def test_format_nba_data():
    # Test data formatting
    test_data = {
        'resultSets': [{
            'name': 'PlayerStats',
            'headers': ['PLAYER_ID', 'PLAYER_NAME', 'PTS'],
            'rowSet': [[1, 'Test Player', 25.5]]
        }]
    }
    
    formatted = format_nba_data(test_data)
    assert 'playerstats' in formatted
    assert formatted['playerstats'][0]['player_id'] == 1
    assert formatted['playerstats'][0]['player_name'] == 'Test Player'
    assert formatted['playerstats'][0]['pts'] == 25.5

def test_handle_nba_response():
    # Test successful response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'resultSets': [{
            'name': 'Test',
            'headers': ['ID'],
            'rowSet': [[1]]
        }]
    }
    
    result = handle_nba_response(mock_response)
    assert 'test' in result
    
    # Test error response
    mock_response.status_code = 404
    result, status_code = handle_nba_response(mock_response)
    assert status_code == 404
    assert 'error' in result 