FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/src
ENV AGRODOMAIN_STAGING_HOST=0.0.0.0
ENV AGRODOMAIN_STAGING_PORT=8000

COPY pyproject.toml /app/pyproject.toml
COPY src /app/src
COPY scripts /app/scripts

RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["python", "-m", "agro_v2.staging_runtime"]
