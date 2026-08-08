FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["sh", "-c", "\
  export DB_SYNC=$(echo $DATABASE_URL | sed 's|postgresql+asyncpg://|postgresql://|g' | sed 's|ssl=require|sslmode=require|g') && \
  DATABASE_URL=$DB_SYNC alembic upgrade head && \
  uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} \
"]
