import time
from datetime import timedelta

from extensions import Session
from logger import get_logger
from config import Config
from models import AuditLog, Project, ProjectEvent, PhotoEvent, log_audit, utcnow
from services import project_store


log = get_logger("retention")


def cleanup_expired_projects():
    now = utcnow()
    db = Session()
    try:
        expired = (
            db.query(Project)
            .filter(Project.expires_at <= now)
            .all()
        )
        if not expired:
            return 0

        count = 0
        for project in expired:
            project_id = str(project.id)
            log_audit(
                db,
                action="project_expired_cleanup",
                actor_user_id=None,
                target_user_id=project.user_id,
                details={
                    "project_id": project_id,
                    "expires_at": (
                        project.expires_at.isoformat()
                        if project.expires_at else None
                    )
                }
            )
            db.commit()

            try:
                project_store.delete_project(project_id)
                count += 1
            except Exception as e:
                log.error("No se pudo borrar proyecto %s: %s", project_id, e)

        log.info("Limpieza completada: %s proyectos", count)
        return count
    finally:
        Session.remove()


def cleanup_expired_events():
    cutoff = utcnow() - timedelta(days=Config.RETENTION_DAYS)
    db = Session()
    try:
        deleted_audit = (
            db.query(AuditLog)
            .filter(AuditLog.created_at < cutoff)
            .delete(synchronize_session=False)
        )
        deleted_projects = (
            db.query(ProjectEvent)
            .filter(ProjectEvent.created_at < cutoff)
            .delete(synchronize_session=False)
        )
        deleted_photos = (
            db.query(PhotoEvent)
            .filter(PhotoEvent.created_at < cutoff)
            .delete(synchronize_session=False)
        )
        db.commit()

        total = (deleted_audit or 0) + (deleted_projects or 0) + (deleted_photos or 0)
        if total:
            log.info(
                "Limpieza eventos: audit=%s projects=%s photos=%s",
                deleted_audit,
                deleted_projects,
                deleted_photos
            )
        return total
    finally:
        Session.remove()


def run_cleanup_loop(interval_seconds=3600):
    while True:
        try:
            cleanup_expired_projects()
            cleanup_expired_events()
        except Exception as e:
            log.error("Error en limpieza automática: %s", e)
        time.sleep(interval_seconds)
