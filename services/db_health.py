import os

from alembic.config import Config as AlembicConfig
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text

from extensions import Session
from logger import get_logger


log = get_logger("db_health")


def get_expected_head(env_override=None):
    if env_override:
        return env_override

    try:
        cfg = AlembicConfig("alembic.ini")
        script = ScriptDirectory.from_config(cfg)
        heads = script.get_heads()
    except Exception as exc:
        log.error("No se pudo leer heads de Alembic: %s", exc)
        return None

    if not heads:
        log.error("No hay heads en Alembic")
        return None
    if len(heads) > 1:
        log.error("Hay múltiples heads en Alembic: %s (merge pendiente)", heads)
        return None
    return heads[0]


def schema_is_current(expected_revision=None):
    session = Session()
    try:
        inspector = inspect(session.bind)
        if not inspector.has_table("alembic_version"):
            log.warning("Tabla alembic_version no existe")
            return False, "alembic_version missing"

        try:
            result = session.execute(text("select version_num from alembic_version limit 1"))
            row = result.scalar()
        except Exception as exc:
            log.error("No se pudo leer alembic_version: %s", exc)
            return False, "alembic_version unreadable"

        if not row:
            log.error("alembic_version vacío")
            return False, "alembic_version empty"

        if expected_revision is None:
            return True, "ok"

        if str(row) != str(expected_revision):
            log.error("Schema desactualizado: %s != %s", row, expected_revision)
            return False, f"schema {row} != {expected_revision}"

        return True, "ok"

    finally:
        Session.remove()
