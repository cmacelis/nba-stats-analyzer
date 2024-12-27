import requests
from functools import wraps
from flask import jsonify
import time

def get_nba_headers():
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Origin': 'https://www.nba.com',
        'Referer': 'https://www.nba.com/',
        'Host': 'stats.nba.com'
    }

def rate_limit(calls_per_second=1):
    def decorator(func):
        last_called = {}
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            now = time.time()
            if func.__name__ in last_called:
                time_passed = now - last_called[func.__name__]
                if time_passed < 1.0 / calls_per_second:
                    time.sleep(1.0 / calls_per_second - time_passed)
            
            result = func(*args, **kwargs)
            last_called[func.__name__] = time.time()
            return result
            
        return wrapper
    return decorator

def handle_nba_response(response):
    """Handle NBA API response and format data"""
    if response.status_code == 200:
        try:
            data = response.json()
            if 'resultSets' in data:
                return format_nba_data(data)
            return data
        except Exception as e:
            return {'error': f'Failed to parse response: {str(e)}'}, 500
    else:
        return {'error': f'NBA API returned status code: {response.status_code}'}, response.status_code

def format_nba_data(data):
    """Format NBA API data into a more usable structure"""
    if not data.get('resultSets'):
        return data

    formatted_data = {}
    for result_set in data['resultSets']:
        headers = result_set['headers']
        rows = result_set['rowSet']
        
        formatted_rows = []
        for row in rows:
            formatted_row = {}
            for i, value in enumerate(row):
                formatted_row[headers[i].lower()] = value
            formatted_rows.append(formatted_row)
            
        formatted_data[result_set['name'].lower()] = formatted_rows
    
    return formatted_data 