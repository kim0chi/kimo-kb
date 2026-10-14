FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY app/package*.json ./
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3
COPY app/ ./
COPY knowledge/ /srv/kimo/knowledge/
COPY content/ /srv/kimo/content/
ENV KB_LIBRARY=/srv/kimo/knowledge KB_CONTENT_ROOT=/srv/kimo/content/si
RUN npm run postinstall && npm test && npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 KB_LIBRARY=/srv/kimo/knowledge KB_CONTENT_ROOT=/srv/kimo/content/si KB_STATE_DB=/srv/kimo/state/kb.sqlite
COPY --from=build --chown=node:node /app/.output/ ./.output/
COPY --chown=node:node app/scripts/backup-state.mjs ./.output/server/backup-state.mjs
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
