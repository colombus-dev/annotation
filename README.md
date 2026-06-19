# Annotation

REST API to upload Jupyter notebooks and annotate their code lines with pipeline steps.

## Setup

```bash
uv sync --dev
uv run fastapi dev
```

API docs available at `http://127.0.0.1:8000/docs`.

## Contributing

```bash
uv run --with pre-commit pre-commit install
```
