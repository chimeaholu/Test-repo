FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

COPY apps/api/pyproject.toml /app/apps/api/pyproject.toml
COPY apps/api/app /app/apps/api/app

RUN pip install --no-cache-dir /app/apps/api

RUN addgroup --system agrodomain && adduser --system --ingroup agrodomain agrodomain \
    && chown -R agrodomain:agrodomain /app

EXPOSE 8000

USER agrodomain

CMD ["uvicorn", "app.main:app", "--app-dir", "/app/apps/api", "--host", "0.0.0.0", "--port", "8000"]
