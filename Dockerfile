FROM node:20-slim

WORKDIR /app

# Ensure Prisma client is generated with the binary engine (avoids adapter requirement).
ENV PRISMA_CLIENT_ENGINE_TYPE=binary

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev

EXPOSE 2000
ENV PORT=2000
CMD ["node", "dist/server.js"]
