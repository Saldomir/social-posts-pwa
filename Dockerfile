# syntax=docker/dockerfile:1.6

# ── Stage 1: install deps (cached separately from source) ──────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build the Next.js app ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `next build` with output:'standalone' in next.config produces a tiny
# self-contained server in .next/standalone that we copy below.
RUN npm run build

# ── Stage 3: minimal runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as non-root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# `standalone` already includes node_modules trimmed to runtime needs,
# but static/ and public/ live outside it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
