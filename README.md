<p align="center">
  <img alt="" src="/.github/assets/cover.png" />
</p>

<h1 align="center">
  Better Auth Next.js Starter
</h1>

<p align="center">
  <a aria-label="Framework" href="https://nextjs.org">
    <img alt="" src="https://img.shields.io/badge/Next.js-000000.svg?style=for-the-badge&logo=Next.js&labelColor=000">
  </a>
  <img alt="" src="https://img.shields.io/github/languages/top/techwithanirudh/better-auth-nextjs-starter?style=for-the-badge&labelColor=000">
  <a aria-label="License" href="https://github.com/techwithanirudh/better-auth-nextjs-starter/blob/main/LICENSE">
    <img alt="" src="https://img.shields.io/github/license/techwithanirudh/better-auth-nextjs-starter?style=for-the-badge&labelColor=000">
  </a>
</p>

## Quickstart

1) Create a PostgreSQL database (local or hosted).

2) Copy `.env.example` in the project root and fill in the variables below.

3) Generate schema and run database migrations.

```bash
bun run auth:generate
bun run db:generate
bun run db:push
```

4) Start the dev server.

```bash
bun run dev
```


## Environment variables

All configuration is typed and validated in `src/env.ts`. Requiredness differs between development and production as described.

```bash
# Runtime (server-only)

# PostgreSQL connection string (required)
# Format must be a valid URL
DATABASE_URL="postgresql://postgres:<YOUR_PASSWORD>@localhost:5432/starter"

# Better Auth secret (required in production; optional in development)
# You can generate via: openssl rand -base64 32
# Docs: https://www.better-auth.com/docs/installation#set-environment-variables
BETTER_AUTH_SECRET=""

# CORS allowed origins for auth endpoints
# Accepts a comma-separated list OR a JSON array of URLs
# Examples:
# CORS_ORIGIN="http://localhost:3000,https://your-domain.com"
# CORS_ORIGIN='["http://localhost:3000","https://your-domain.com"]'
CORS_ORIGIN="http://localhost:3000"

# Runtime (client-exposed)

# Public base URL of your site (required)
# Must be a full URL including protocol
# Example (dev): http://localhost:3000
# Example (prod): https://your-domain.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000


# Build-time / tooling (optional)

# Enable bundle analyzer for production builds
ANALYZE=false

# Emit production browser source maps
SOURCE_MAPS=false
```

Notes
- `CORS_ORIGIN` may be a single URL, a comma-separated list, or a JSON array. All values must be valid URLs.
- `BETTER_AUTH_SECRET` is mandatory in production. In development it can be left empty to use the library defaults, but setting it early avoids surprises.
- `NEXT_PUBLIC_BASE_URL` is used for authentication, metadata, and sitemap generation. It must be the publicly reachable URL of your app.


## Database and migrations

This starter uses Drizzle ORM with PostgreSQL. Common commands:

```bash
# Generate SQL from schema
bun run db:generate

# Apply migrations
bun run db:push

# Open Drizzle Studio
bun run db:studio
```


## Features

[Better Auth](https://better-auth.com)

[Better Auth UI](https://better-auth-ui.com)

[shadcn/ui](https://ui.shadcn.com)

[TailwindCSS](https://tailwindcss.com)

[Drizzle ORM](https://orm.drizzle.team)

[PostgreSQL](https://postgresql.org)

[Biome](https://biomejs.dev)

[Next.js](https://nextjs.org)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

After creating a project, set the environment variables from the section above in the Vercel project settings and redeploy.
