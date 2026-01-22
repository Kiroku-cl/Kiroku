from flask import Blueprint, render_template, jsonify

from config import Config


pages_bp = Blueprint('pages', __name__)


@pages_bp.route("/")
def index():
    return render_template("index.html")


@pages_bp.route("/projects")
def projects_page():
    return render_template("projects.html")


@pages_bp.route("/health")
def health():
    return jsonify({"ok": True})


@pages_bp.route("/api/config")
def get_config():
    return jsonify({
        "chunk_duration": Config.CHUNK_DURATION
    })
