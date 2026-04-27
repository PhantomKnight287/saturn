<div align="center">

<img src="./public/logo/light.svg" align="center" width="50">

# Saturn

The operating system for your freelance business.

[saturn.procrastinator.fyi](https://saturn.procrastinator.fyi)

</div>

Saturn brings projects, timesheets, invoices, and client management into one place. No more spreadsheets. No more chasing emails. Just open Saturn and get to work.

Whether you're a solo developer or a design agency with 20 people, Saturn adapts to how you work.

## Features

### Requirements
Write detailed project requirements with a rich-text editor — images, code blocks, and all. Share them with clients for review. Clients leave threaded comments, request changes, or sign off with a digital signature — all without leaving Saturn.

### Proposals
Draft and send proposals. Clients review and approve without leaving the platform.

### Milestones
Break work into milestones. Track what's done, what's in progress, and what's next.

### Timesheets
Log hours against requirements with weekly, biweekly, or monthly views. Send reports to clients and generate invoices directly from tracked time.

### Expenses
Track project expenses by category — hosting, design tools, APIs, and more.

### Invoices
Generate invoices with line items pulled from timesheets and expenses. Export as PDF and send them to clients.

### Client Portal
Clients register on the same platform — no separate portal. They get invited to your projects and see milestone progress, requirements to sign, and invoices to review. Your internal timesheets and team rates stay private.

### Roles & Permissions
Four roles with fine-grained permissions:
- **Owner** — Full control over the organization, billing, members, and all projects.
- **Admin** — Day-to-day management. Creates projects, sends invoices, manages the team.
- **Member** — Does the work. Logs time, writes requirements, submits expenses.
- **Client** — Reviews work, signs off on requirements, approves invoices.

## Tech Stack

- **Framework** — [Next.js](https://nextjs.org)
- **Auth** — [Better Auth](https://www.better-auth.com)
- **Database** — [Drizzle ORM](https://orm.drizzle.team) with PostgreSQL
- **Styling** — [Tailwind CSS](https://tailwindcss.com)
- **Storage** — S3-compatible object storage
- **Email** — [React Email](https://react.email)


> [!Note]
> AI has been used in development of this project. 

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Run database migrations
bun db:migrate

# Start the dev server
bun dev
```

## Pricing

- **Free** — 1 organization, 2 projects, unlimited team members, all core features.
- **Pro ($3/mo)** — Unlimited organizations and projects, priority support.

No credit card required. No feature gates on core functionality.

## License

This project is not open source. All rights reserved.
