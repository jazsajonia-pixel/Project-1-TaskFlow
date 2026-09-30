FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci
COPY . .
RUN npm run db:generate && npm run build

FROM build AS server
ENV NODE_ENV=production
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["node", "server/dist/server/src/index.js"]

FROM nginxinc/nginx-unprivileged:1.28-alpine AS client
COPY --chown=nginx:nginx --chmod=644 docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/client/dist /usr/share/nginx/html
EXPOSE 8080
