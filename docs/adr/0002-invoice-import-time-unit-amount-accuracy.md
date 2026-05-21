# Invoice import: amount derived from duration, not quantity × unit price

When billable time entries are imported into an invoice, the creator can choose the line **time unit** — `hours` (90m → `1.5`) or `minutes` (90m → `90`) — and `unitPrice` is converted to match (per-hour rate, or per-minute rate rounded to 4 dp). We decided that a line's `amount` is always computed from the **exact duration** (`durationMinutes / 60 × hourlyRate`, rounded to 2 dp), independent of the displayed unit and the rounded per-minute `unitPrice`. This keeps invoice totals identical no matter which unit was picked and free of per-minute rounding drift — the unit changes only how a line *reads*, never what it sums to.

## Considered options

- **Amount = quantity × rounded unitPrice** (line is internally self-consistent — a client can multiply `90 × 1.6667` and land on the shown amount). Rejected: the per-minute rate is lossy, so this reintroduces 1-cent drift into line amounts and the invoice total — the exact "complex math" issue #56 set out to remove.
- **Amount derived from exact duration** (chosen). Totals stay correct and unit-invariant; the only cost is that a client multiplying the displayed per-minute rate by the quantity may land a sub-cent off the shown amount, which is invisible at the PDF's 2-dp rendering.

## Consequences

- The invoice editor recomputes `amount = quantity × unitPrice` (4 dp) whenever a user hand-edits a line's quantity or unit price (`invoice-item.tsx`). The duration-derived amount is therefore authoritative only until a row is manually edited. When a user only nudges values within rounding tolerance, the divergence from the duration-derived amount stays limited to rounding/precision differences (sub-cent) and does not surface at 2-dp display. Intentional, material edits to quantity or unitPrice will, by design, produce larger deviations — the recomputed `amount` then reflects the user's explicit values rather than the original duration.
- Both import paths (the manual `ImportTimeEntriesDialog` and the silent `autoImportTime` effect) must use the same conversion helper so amounts cannot diverge by entry path.
