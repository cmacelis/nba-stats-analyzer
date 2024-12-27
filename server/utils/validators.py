from functools import wraps
from flask import request, jsonify

def validate_season_format(season):
    """Validate season format (e.g., '2023-24')"""
    try:
        start_year = int(season.split('-')[0])
        end_year = int(season.split('-')[1])
        return start_year > 1946 and len(season.split('-')[1]) == 2
    except:
        return False

def require_params(*params):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            missing = [p for p in params if not request.args.get(p)]
            if missing:
                return jsonify({
                    'error': f'Missing required parameters: {", ".join(missing)}'
                }), 400
            return f(*args, **kwargs)
        return wrapper
    return decorator 