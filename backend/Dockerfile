FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ARG APP_UID=1001
ARG APP_GID=1001

ENV APP_USER=appuser
ENV APP_HOME=/app
ENV DATA_DIR=/app/data

WORKDIR $APP_HOME

RUN set -eux; \
    groupadd --gid ${APP_GID} ${APP_USER}; \
    useradd \
        --uid ${APP_UID} \
        --gid ${APP_GID} \
        --home-dir ${APP_HOME} \
        --no-create-home \
        ${APP_USER}

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=${APP_USER}:${APP_USER} . .

RUN set -eux; \
    mkdir -p ${DATA_DIR}; \
    chown -R ${APP_USER}:${APP_USER} ${APP_HOME}; \
    chmod 755 ${DATA_DIR}

USER ${APP_USER}

EXPOSE 8000

# comando x defecto
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "4", "--timeout", "120", "app:app"]
