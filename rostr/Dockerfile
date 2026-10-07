FROM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY index.js ./
COPY src ./src
COPY public ./public
COPY policy ./policy

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    ROSTR_DB_PATH=/data/rostr.sqlite \
    ROSTR_AUTH_LOG=/logs/rostr-auth.jsonl \
    ROSTR_SCIM_LOG=/logs/scim.jsonl

COPY --from=build /app /app
RUN mkdir -p /data /logs && chown -R node:node /app /data /logs

USER node
EXPOSE 3000
CMD ["node", "index.js"]
