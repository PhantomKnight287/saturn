# Testing

## Stack

- **Vitest** — unit & integration (services, helpers)
- **Playwright** — E2E user journeys, loading/error states, visual regression on failure
- **Real Postgres** — never mock the DB; the domain (custom-field cascades, settings cascade, calendar-date semantics) silently breaks under mocks

## Commands

```bash
bun test              # vitest, one shot
bun test:watch        # vitest, watch
bun test:coverage     # vitest + v8 coverage (HTML in coverage/)
bun test:e2e          # playwright (boots dev server)
bun test:e2e:install  # one-time browser download
```

## Docker (zero local setup)

If you don't want Postgres/Bun/Playwright installed locally:

```bash
bun test:docker         # vitest in a container against ephemeral postgres
bun test:docker:e2e     # playwright in a container
bun test:docker:down    # tear down + wipe volume
```

Postgres data lives on tmpfs — every `down` is a clean slate. The runner image is built from `Dockerfile.test`; first build is slow (chromium download), subsequent runs hit the cache.

## Local setup for DB-backed tests

```bash
createdb saturn_test
DATABASE_URL=postgresql://postgres@localhost:5432/saturn_test bun db:migrate
DATABASE_URL=postgresql://postgres@localhost:5432/saturn_test bun test
```

Tests reset state between cases via `resetDb()` in `tests/helpers/db.ts` — call it from `beforeEach` in any integration test.

## Layering

| Layer | What | Where | Priority |
| --- | --- | --- | --- |
| 1 | Pure helpers | `src/lib/*.test.ts` next to source | High |
| 2 | Services (real DB) | `src/app/api/<domain>/service.test.ts` | High |
| 3 | Server actions (auth/permissions) | `src/app/.../actions.test.ts` | High |
| 4 | E2E golden paths | `tests/e2e/*.spec.ts` | Medium |
| 5 | Loading/error states via route interception | `tests/e2e/*.spec.ts` | Low |

What we explicitly **don't** test: `src/components/ui/*` (shadcn primitives), React Email templates, Tailwind classes, Drizzle query-builder internals.

## Layer 1 inventory

What ships in this scaffold, with what each test actually guards:

| File | Guards |
| --- | --- |
| `src/lib/invoice-time-units.test.ts` | Money math invariants (CONTEXT.md "import amount accuracy") |
| `tests/unit/env.test.ts` | `@/env` schema parses; required keys exposed |
| `tests/integration/migrations.test.ts` | Every domain table exists after `bun db:migrate` |
| `tests/e2e/smoke.spec.ts` | Homepage boots; no console errors |
| `tests/e2e/public-pages.spec.ts` | Privacy/terms/changelogs/blog/auth pages reachable; 404 works |
| `tests/e2e/auth-gating.spec.ts` | Gated routes redirect unauthenticated visitors |
| `tests/e2e/sign-up.spec.ts` | Sign-up form submits and lands somewhere sane |

**Known gap (intentional):** the full freelancer golden path (sign-up → org → project → timesheet → invoice → PDF) requires post-verification access. Wire a mail catcher (Mailpit) into `docker-compose.test.yml` or implement `seedVerifiedUser` in `tests/e2e/helpers/auth.ts` to unlock it. See the TODO in that file.

## Conventions

- Co-locate unit tests with source (`foo.ts` → `foo.test.ts`). E2E lives under `tests/e2e/`.
- One service file → one `service.test.ts`. Group tests by method.
- Money assertions use exact strings (`'150.00'`), never floats.
- Auth/permission boundaries deserve a denial test for every action — wrong role + cross-org input.

## CI

`.github/workflows/test.yml` runs unit + E2E jobs on every push against a Postgres 16 service container. Playwright reports upload on failure.
