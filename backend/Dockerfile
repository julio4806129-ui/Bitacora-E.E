FROM python:3.11-slim

# Evitar generación de .pyc y activar unbuffered stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema requeridas para postgres, compilación y healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY . .

# Crear usuario sin privilegios root
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/media /app/logs && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Health check usando curl al endpoint /api/health/
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/api/health/ || exit 1

# Servir mediante Gunicorn con 4 workers
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "config.wsgi:application"]
