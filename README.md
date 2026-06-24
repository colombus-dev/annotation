# Annotation

REST API to upload and annotate ML source code line by line.

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
