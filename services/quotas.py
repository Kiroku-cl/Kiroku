from datetime import timedelta

from extensions import Session
from logger import get_logger
from models import User, utcnow


log = get_logger("quota")


WINDOW_HOURS = 24


def _reset_window(user, started_attr, used_attr, now):
    started_at = getattr(user, started_attr)
    if not started_at or now - started_at >= timedelta(hours=WINDOW_HOURS):
        setattr(user, started_attr, now)
        setattr(user, used_attr, 0)
        return True
    return False


def reserve_script_quota(user_id, reason=""):
    return _reserve_quota(
        user_id,
        quota_attr="daily_script_quota",
        used_attr="scripts_used_in_window",
        started_attr="quota_window_started_at",
        label="guiones",
        reason=reason
    )


def release_script_quota(user_id):
    _release_quota(
        user_id,
        quota_attr="daily_script_quota",
        used_attr="scripts_used_in_window"
    )


def reserve_stylize_quota(user_id, reason=""):
    return _reserve_quota(
        user_id,
        quota_attr="daily_stylize_quota",
        used_attr="stylizes_used_in_window",
        started_attr="stylize_window_started_at",
        label="estilizaciones",
        reason=reason,
        requires_flag="can_stylize_images"
    )


def release_stylize_quota(user_id):
    _release_quota(
        user_id,
        quota_attr="daily_stylize_quota",
        used_attr="stylizes_used_in_window"
    )


def _release_quota(user_id, quota_attr, used_attr):
    db = Session()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user or user.is_admin:
            return

        if getattr(user, quota_attr) is None:
            return

        used = getattr(user, used_attr) or 0
        if used > 0:
            setattr(user, used_attr, used - 1)
            db.commit()
    finally:
        Session.remove()


def _reserve_quota(
    user_id,
    quota_attr,
    used_attr,
    started_attr,
    label,
    reason="",
    requires_flag=None
):
    db = Session()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return False, "Usuario no encontrado"

        if user.is_admin:
            return True, None

        if requires_flag and not getattr(user, requires_flag, False):
            return False, "No tienes permiso para usar esta función"

        quota_value = getattr(user, quota_attr)
        if quota_value is None:
            return True, None

        try:
            quota_value = int(quota_value)
        except (TypeError, ValueError):
            return False, "La cuota no es válida"

        if quota_value <= 0:
            return False, f"No tienes cuota disponible para {label}"

        now = utcnow()
        _reset_window(user, started_attr, used_attr, now)

        used = getattr(user, used_attr) or 0
        if used >= quota_value:
            return False, f"Has alcanzado tu cuota diaria de {label}"

        setattr(user, used_attr, used + 1)
        db.commit()

        if reason:
            log.info(f"Reserva de cuota {label}: user={user.id} reason={reason}")

        return True, None
    finally:
        Session.remove()
