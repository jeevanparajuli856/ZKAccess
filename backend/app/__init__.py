from flask import Flask, request
from .config import Settings
from .db import init_db
from .routes import bp


def create_app() -> Flask:
    app = Flask(__name__)
    settings = Settings()
    app.config['SETTINGS'] = settings
    init_db(settings.DATABASE_URL)
    app.register_blueprint(bp, url_prefix='/api')

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin and origin in settings.CORS_ORIGINS:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Vary'] = 'Origin'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
            response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
        return response

    return app

# For `flask --app app.routes run`, the app is created in routes.py
