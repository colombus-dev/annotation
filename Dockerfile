FROM ghcr.io/astral-sh/uv:python3.12-alpine

WORKDIR /annotation

COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project

RUN adduser -D appuser
RUN chown -R appuser:appuser /annotation
USER appuser

COPY ./api/ /annotation/api/

CMD [".venv/bin/fastapi", "dev", "api/main.py", "--host", "0.0.0.0", "--port", "8181"]
