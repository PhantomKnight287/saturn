FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock* package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN \
  if [ -f bun.lock ]; then npm i -g bun && bun install --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "No lockfile found." && exit 1; \
  fi

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Skip env validation during build
ARG GITHUB_ACTIONS=true

# Database
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Auth
ARG BETTER_AUTH_SECRET
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ARG GITHUB_CLIENT_ID
ENV GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET
ENV GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET

# Mail
ARG MAIL_HOST
ENV MAIL_HOST=$MAIL_HOST
ARG MAIL_PORT
ENV MAIL_PORT=$MAIL_PORT
ARG MAIL_USER
ENV MAIL_USER=$MAIL_USER
ARG MAIL_PASSWORD
ENV MAIL_PASSWORD=$MAIL_PASSWORD
ARG MAIL_SECURE
ENV MAIL_SECURE=$MAIL_SECURE

# S3
ARG S3_ENDPOINT
ENV S3_ENDPOINT=$S3_ENDPOINT
ARG S3_REGION
ENV S3_REGION=$S3_REGION
ARG S3_ACCESS_KEY_ID
ENV S3_ACCESS_KEY_ID=$S3_ACCESS_KEY_ID
ARG S3_SECRET_ACCESS_KEY
ENV S3_SECRET_ACCESS_KEY=$S3_SECRET_ACCESS_KEY
ARG S3_BUCKET
ENV S3_BUCKET=$S3_BUCKET

ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

RUN \
  if [ -f bun.lock ]; then npm i -g bun && bun run build; \
  elif [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  fi

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
