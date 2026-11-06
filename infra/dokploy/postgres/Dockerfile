# PostgreSQL and logical decoding for Realtime v2.102.3.
FROM postgres:17.11-bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17-wal2json \
    && rm -rf /var/lib/apt/lists/*
