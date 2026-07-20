FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.cache/npm \
    npm ci

CMD ["npm", "run", "dev", "--", "--host"]
