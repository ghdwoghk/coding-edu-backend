FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate

FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/app.js"]
