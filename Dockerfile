# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY .npmrc package.json package-lock.json* ./
ARG NPM_TOKEN=""
RUN if [ -n "$NPM_TOKEN" ]; then echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> .npmrc; fi && \
    npm install --ignore-scripts && \
    rm -f .npmrc

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ── Production stage ────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env* ./

USER nextjs
EXPOSE 8080

# Source .env.local at runtime — Next.js standalone does NOT read dotenv files.
CMD ["sh", "-c", "if [ -f .env.local ]; then set -a && . ./.env.local && set +a; fi && node server.js"]
