FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

COPY apps/api/pyproject.toml /app/apps/api/pyproject.toml
COPY apps/api/app /app/apps/api/app

RUN pip install --no-cache-dir /app/apps/api

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--app-dir", "/app/apps/api", "--host", "0.0.0.0", "--port", "8000"]
