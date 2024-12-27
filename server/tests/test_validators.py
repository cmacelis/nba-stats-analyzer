import pytest
from utils.validators import validate_season_format, require_params
from flask import Flask, jsonify

def test_validate_season_format():
    # Valid seasons
    assert validate_season_format('2023-24') == True
    assert validate_season_format('1947-48') == True
    
    # Invalid seasons
    assert validate_season_format('2023-2024') == False
    assert validate_season_format('1946-47') == False  # Too early
    assert validate_season_format('invalid') == False
    assert validate_season_format('2023/24') == False

def test_require_params():
    app = Flask(__name__)
    
    @app.route('/test')
    @require_params('name', 'age')
    def test_endpoint():
        return jsonify({'success': True})
    
    with app.test_client() as client:
        # Missing both parameters
        response = client.get('/test')
        assert response.status_code == 400
        assert b'Missing required parameters: name, age' in response.data
        
        # Missing one parameter
        response = client.get('/test?name=John')
        assert response.status_code == 400
        assert b'Missing required parameters: age' in response.data
        
        # All parameters present
        response = client.get('/test?name=John&age=25')
        assert response.status_code == 200 