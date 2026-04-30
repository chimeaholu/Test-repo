FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

COPY apps/api/pyproject.toml /app/apps/api/pyproject.toml
COPY apps/api/app /app/apps/api/app
COPY apps/api/start.sh /app/apps/api/start.sh

RUN pip install --no-cache-dir /app/apps/api

RUN addgroup --system agrodomain && adduser --system --ingroup agrodomain agrodomain \
    && chmod +x /app/apps/api/start.sh \
    && chown -R agrodomain:agrodomain /app

EXPOSE 8000

USER agrodomain

CMD ["/app/apps/api/start.sh"]
