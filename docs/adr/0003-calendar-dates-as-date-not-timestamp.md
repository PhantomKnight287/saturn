# Calendar-date columns use Postgres `date`, not `timestamp`

User-picked day fields — `time_entries.date`, `member_rates.effective_from`, `invoices.issueDate`, `invoices.dueDate`, `expenses.date`, `milestones.dueDate`, `projects.dueDate`, `proposals.validUntil` — are stored as Postgres `date` (`'YYYY-MM-DD'`), not `timestamp`. They are zoneless calendar facts: "due June 1" must read June 1 for every viewer regardless of timezone, and a deadline is not relative to where the viewer stands.

They were originally `timestamp`, written via `new Date("YYYY-MM-DD")` (UTC midnight) and rendered with locale formatting — which shifted the day backwards for any viewer west of UTC (server-rendered vs client-rendered surfaces could already disagree). Storing the day as an instant was the root cause; the saved user timezone would have made the bug worse, not better, by applying a zone to a value that should have none.

## Considered Options

- **Migrate to `date` (chosen).** Makes the wrong state unrepresentable: a value with no time component cannot be zone-shifted by any render site, present or future. Existing rows convert losslessly via `(col AT TIME ZONE 'UTC')::date`.
- **Keep `timestamp`, force-UTC at every render site.** Rejected: fragile by construction — every current and future call site must remember the UTC formatter; one miss silently shifts the day, and fabricated `00:00:00Z` noise persists.

## Consequences

The saved [user timezone](../../CONTEXT.md) applies only to **moments** (`createdAt`, `sentAt`, `signedAt`, `completedAt`, custom-field `datetime`), which stay `timestamp` and render in the viewer's zone. Write paths for the migrated columns store the raw `"YYYY-MM-DD"` string instead of a `Date`; their form/Zod types become `string`.
