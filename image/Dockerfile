FROM node:22-bookworm-slim AS app-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY scripts ./scripts
COPY src ./src
COPY README.md LICENSE ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV APISTRY_CONFIG_PATH=/home/node/site/config.yml

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

RUN mkdir -p /home/node/site

COPY --from=app-build /app/dist ./dist
COPY image/config.yml /home/node/site/config.yml
COPY docs-site/static/contracts /home/node/site/contracts
COPY data/sqlite.db /home/node/site/sqlite.db

RUN chown -R node:node /app /home/node/site

USER node

EXPOSE 3000

ENTRYPOINT ["sh", "-c", "exec node dist/apistry.js start --config /home/node/site/config.yml"]