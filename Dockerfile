# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
# tzdata is required on Alpine/musl for the TZ env var to actually take
# effect (otherwise Node silently falls back to UTC) — this app computes
# "today"/"this month" boundaries in application code, and the business is
# Thailand-based, so the container's local time must be Asia/Bangkok
# regardless of the host machine's own timezone.
RUN apk add --no-cache libc6-compat openssl tzdata
ENV TZ=Asia/Bangkok
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
