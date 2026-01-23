# HILO (Herramienta de Improvisación y Libreto Oral)

Aplicación para grabar y transcribir sesiones de video, generando guiones con IA.

## Requisitos

- Docker y Docker Compose
- API Key de OpenAI (opcional, para transcripción y generación)

## Dev

### 1. Configurar variables de entorno
```bash
cp env.example .env
# Conigura todo el temita
```

### 2. Docker

```bash
docker compose up -d
```

### 3. Ejecutar migraciones

```bash
docker compose exec web alembic upgrade head
```

### 4. Crear usuario administrador

docker compose exec web flask create-admin


## Prod

### 1. Configurar variables de entorno

```bash
cp env.example .env

# y todo esto...
FLASK_ENV=production
FLASK_SECRET_KEY=genera-una-clave-segura-aqui
DATABASE_URL=postgresql+psycopg://usuario:password@db:5432/hilo
POSTGRES_USER=usuario
POSTGRES_PASSWORD=password-seguro
POSTGRES_DB=lolxd
COOKIE_SECURE=1
```

### 2. Levantar servicios

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 3. Migraciones 

```bash
docker compose -f docker-compose.prod.yml exec web alembic upgrade head
```

### 4. Crear administrador

```bash
docker compose -f docker-compose.prod.yml exec web flask create-admin
```
## Comandos útiles :)
```bash
# Crear nueva migración
docker compose exec web alembic revision --autogenerate -m "descripción"

# Aplicar migraciones
docker compose exec web alembic upgrade head

# Revertir última migración
docker compose exec web alembic downgrade -1

