FROM node:22-bookworm-slim AS app-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY scripts ./scripts
COPY src ./src
COPY README.md LICENSE ./
RUN npm run build


FROM node:22-bookworm-slim AS docs-build

WORKDIR /app/docs-site

COPY docs-site/package.json docs-site/package-lock.json ./
RUN npm ci

COPY docs-site ./
RUN npm run build


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV APISTRY_HOST=0.0.0.0
ENV APISTRY_PORT=3000
ENV CONFIG_PATH=/app/config/config.yml
ENV SERVICE_NAME=apistry

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=app-build /app/dist ./dist
COPY --from=docs-build /app/docs-site/build ./docs-site/build
COPY --from=docs-build /app/docs-site/build /home/ec2-user/site/docs
COPY docs-site/static ./docs-site/static
COPY docs-site/static/contracts /home/ec2-user/site/contracts
COPY contracts ./contracts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/config /app/data /home/ec2-user/site \
    && chown -R node:node /app /home/ec2-user \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
