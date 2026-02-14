from flask import Flask
from .config import Settings
from .db import init_db
from .routes import bp


def create_app() -> Flask:
    app = Flask(__name__)
    settings = Settings()
    app.config['SETTINGS'] = settings
    init_db(settings.DATABASE_URL)
    app.register_blueprint(bp, url_prefix='/api')
    return app

# For `flask --app app.routes run`, the app is created in routes.py
