from .pages import pages_bp
from .projects import projects_bp
from .media import media_bp
from .jobs import jobs_bp


def register_blueprints(app):
    app.register_blueprint(pages_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(media_bp)
    app.register_blueprint(jobs_bp)
