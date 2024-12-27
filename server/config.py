import os
from dotenv import load_dotenv

load_dotenv()

def get_env_variable(name, default=None):
    """Get environment variable or raise exception if required and not found"""
    value = os.getenv(name, default)
    if value is None:
        raise ValueError(f'Environment variable {name} is not set')
    return value

class Config:
    SECRET_KEY = get_env_variable('SECRET_KEY', 'dev')
    NBA_API_KEY = get_env_variable('NBA_API_KEY')  # Required
    DATABASE_URL = get_env_variable('DATABASE_URL', 'sqlite:///nba_stats.db')
    
    # NBA API endpoints
    NBA_API_BASE_URL = 'https://stats.nba.com/stats'
    PLAYER_PROFILE_ENDPOINT = f'{NBA_API_BASE_URL}/playerprofilev2'
    PLAYER_STATS_ENDPOINT = f'{NBA_API_BASE_URL}/leaguedashplayerstats' 