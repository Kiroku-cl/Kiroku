import os

from flask import Flask

from config import Config
from logger import log
from limiter import limiter
from routes import register_blueprints


app = Flask(__name__)

limiter.init_app(app)
register_blueprints(app)

if __name__ == "__main__":
    os.makedirs(Config.DATA_DIR, exist_ok=True)
    os.makedirs(os.path.join(Config.DATA_DIR, "jobs"), exist_ok=True)
    app.run(debug=True, host="0.0.0.0", port=8000)
