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

RUN mkdir -p /app/contracts /app/data

COPY --from=app-build /app/dist ./dist
COPY image/config.yml /app/config.yml
COPY docs-site/static/contracts /app/contracts

RUN chown -R node:node /app

USER node

EXPOSE 3000

ENTRYPOINT ["sh", "-c", "exec node dist/apistry.js start --config \"$APISTRY_CONFIG_PATH\""]
