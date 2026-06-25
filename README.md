# Annotation

REST API to upload and annotate ML source code line by line.

## Deploy

```bash
git clone git@github.com:colombus-dev/annotate.git && cd annotate
cp .env.sample.prod .env # then edit .env
docker compose -f docker-compose.prod.yml up -d --build
```

**Update:**
```bash
docker compose -f docker-compose.prod.yml pull annotate_api annotate_app
docker compose -f docker-compose.prod.yml up -d
```

## Setup

```bash
cp .env.sample.dev .env # then edit .env
uv sync --dev
uv run fastapi dev
```

API docs available at `http://127.0.0.1:8000/docs`.

## Contributing

```bash
uv run --with pre-commit pre-commit install
```
