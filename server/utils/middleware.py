import time
from flask import request, current_app
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_request_logging(app):
    @app.before_request
    def before_request():
        request.start_time = time.time()

    @app.after_request
    def after_request(response):
        if hasattr(request, 'start_time'):
            elapsed = time.time() - request.start_time
            logger.info(
                f'Request: {request.method} {request.path} '
                f'Status: {response.status_code} '
                f'Duration: {elapsed:.2f}s'
            )
        return response 