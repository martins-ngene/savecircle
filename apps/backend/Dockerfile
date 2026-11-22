FROM node:22-bookworm-slim AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies across all workspaces
RUN npm ci

# Copy and compile shared package
COPY packages/shared ./packages/shared
RUN npm --prefix packages/shared run build

# Copy and compile backend
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4000
ENV API_PREFIX=api

COPY --from=builder /app /app

WORKDIR /app/apps/backend
USER node
EXPOSE 4000

CMD ["node", "dist/main.js"]
