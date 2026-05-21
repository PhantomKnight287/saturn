# Saturn — Domain Context

## Glossary

### Custom Field (timesheet)
A configurable extra field that appears on the timesheet entry form, defined at organization or project scope.

- **Identity** — each field has a stable, randomly generated ID. The ID never changes; label, type constraints (e.g., required), default value, and options are mutable in place.
- **Historical entries** — because entries reference fields by ID, renaming a field retroactively re-labels old values; entries are not snapshotted. Old values are never re-validated against changed constraints — existing entries are not required to stay valid when a field definition changes.
- **Deletion** — hard delete. Removing a field definition cascades and removes all stored values for that field across all time entries. The parent time entry rows themselves remain.
- **Scope** — defined at the **organization** level (Saturn's term; the issue uses "workspace" synonymously) or the **project** level.

### Org-level fields vs. Project-level fields
Org-level fields are **templates**. They never apply to a timesheet form on their own (all time entries are project-scoped — see `time_entries.project_id`). Projects acquire fields in two ways:

- **Hybrid auto-import on project creation.** When a project is created, the current set of org-level fields is copied into the project in the same DB transaction as project creation. Each copy gets a new field ID; the link to the org field is not retained.
- **Manual import later.** A project admin can re-open the import dialog from project settings and choose any subset of current org fields to copy in. Same snapshot semantics — fresh IDs, no live link.

After import, project fields are fully independent. Editing or deleting the org-level source field does not affect copies already in projects. Adding new org-level fields does not retroactively touch existing projects.

### Field types (v1)
`text | number | select | checkbox | date | datetime | time`.

- **text** — single-line, optional max-length (default 500).
- **number** — decimals allowed; stored as the JSON number; optional min/max.
- **select** — single-select, closed list of admin-defined options. No free-text "Other".
- **checkbox** — single boolean.
- **date** — calendar date, stored as `YYYY-MM-DD`.
- **datetime** — TZ-aware. Stored as ISO 8601 UTC (`…Z`), displayed in viewer's locale.
- **time** — wall-clock time of day, stored as `HH:MM` (24h). No TZ.

Out of v1: multi-select, file upload, URL/email, member-picker, tags, textarea, date range.

### Default values
Each field definition has an optional default. By type:

- `text` / `number` / `select` / `date` / `datetime` / `time` — a literal value, or null (no default).
- `checkbox` — boolean, defaults to `false` if unset.
- Temporal types additionally accept sentinel strings:
  - `date` → `'today'` — viewer's local calendar date at render time.
  - `time` → `'now'` — viewer's local wall-clock time at render time.
  - `datetime` → `'now'` — viewer's local moment at render time, stored as its UTC equivalent.

Sentinels are stored verbatim in the definition's default column; resolution happens client-side when the form is rendered.

### Settings UI placement
The existing **Defaults** tab on org and project settings is renamed **Timesheet** and grows a second card, **Custom fields**, beneath the existing timesheet defaults card. No new top-level tab is added.

### Import-from-organization picker (project settings)
Modal with a checkbox list of every current org-level field plus a "Select all" toggle. Rows whose label already exists on the project (case-insensitive trimmed match) show an inline `Already in project` warning chip but remain checkable — re-importing produces a fresh, independent copy.

### Timesheet form: dialog vs. page
The timesheet entry form is rendered as the existing **Dialog** when the project has zero custom fields configured. The moment a project has ≥1 custom field, both create and edit switch to dedicated routes:

- create → `/[org]/[project]/timesheets/new`
- edit   → `/[org]/[project]/timesheets/[entryId]/edit`

Rationale: custom-field count is unbounded, dialog height becomes unpredictable, and a page provides natural room. The form body is one shared component wrapped by either the Dialog or the page.

### Reporting / filtering on custom values
v1 ships **display only**. Custom values are persisted, rendered on the form, and shown read-only on entry detail/list views. No filter UI, no group-by, no aggregation. Filterable/groupable reports are deferred (the JSON storage choice acknowledges this cost upfront — see [Custom Field Value](#custom-field-value)).

### Ordering
Fields render in `createdAt` ascending order, both in settings UIs and on the timesheet form. No `position` column is required on field-definition tables.

### Permissions
- **Org-level field defs**: managed (create/edit/delete) by owner + admin only.
- **Project-level field defs**: managed by owner + admin only (no per-project "lead" role exists in Saturn).
- **Members**: see and fill the form; cannot manage definitions.
- **Clients**: never see field definitions; only see rendered values for fields with `visibleToClient = true` on artifacts shared with them.

### Client visibility
Each field definition carries a `visibleToClient` boolean, default `false`. On shared timesheet reports, only values for fields with `visibleToClient = true` are exposed to clients — the field list is filtered at query time (`getProjectCustomFields` adds `visibleToClient = true` for the `client` role) before rendering. Invoices do not render custom values in v1.

### Display of custom values
Custom values render inline read-only via `CustomValuesInline`, a shared component used on both internal surfaces (timesheet list/detail rows for members and admins) and client-facing shared timesheet reports (`ReportCard` with `viewerRole='client'`). On the client surface the rendered set is already restricted to opted-in fields by the query-time filter above, so `CustomValuesInline` itself needs no client-specific gating. The v1 treatment is a simple inline append to the entry's description cell, not a dedicated UX. Invoice rendering of custom values is deferred.

### Constraint changes on existing fields
Constraint edits (label, required, default, dropdown options, etc.) are always allowed at the definition level. Existing entries are not required to stay valid when a definition changes. Validation is **enforce-on-write, never on read**:

- Reads of historical entries always succeed regardless of current constraints; old values are never retroactively re-validated.
- A new write (create or edit) to a time entry validates `custom_values` against the *current* field definition.
- The field editor does not pre-compute or warn about impact on existing data in v1. Admins are trusted. Revisit if it becomes a support issue.
- **Field type is immutable after creation.** To change a type, delete the field (cascading its values) and create a new one.

### Invoice time unit
The basis used for the `quantity` column when billable time entries are turned into invoice line items. Two values only (v1): `hours` (default) and `minutes`.

- **Hours** — `quantity = durationMinutes / 60` (e.g. 90m → `1.5`), `unitPrice = hourlyRate` per hour.
- **Minutes** — `quantity = durationMinutes` (whole integer, e.g. `90`), `unitPrice = hourlyRate / 60` rounded to 4 decimals (the per-minute rate).
- The unit only changes how a line *reads*; it never changes the line's `amount` or the invoice total. See [Import amount accuracy](#import-amount-accuracy).
- Days and other units are out of v1.

### Default invoice time unit
The persisted pre-selection for the import unit, stored on the `settings` table (`invoiceTimeUnit` enum) at both **organization** and **project** scope. Resolution is **project row if present, else org row, else `hours`** — the same cascade as the other invoice/timesheet defaults (`projectOrOrgSettings`). It only *seeds* the import — the creator can override per-import in the dialog. Surfaced in a dedicated **Invoice import defaults** card on both org and project settings.

### Import paths
Two flows convert billable time entries into line items, and both honor the resolved time unit via one shared conversion helper:

- **Manual import** — `ImportTimeEntriesDialog`, opened from the invoice editor. Carries a `Hours | Minutes` segmented toggle (seeded from the default, overridable). Per-entry rows show real durations via `formatMinutes`; the aggregate "selected" badge reflects the chosen unit (`90m selected` / `1.5h selected`).
- **Auto-import** — the silent `autoImportTime` effect that fires when an invoice is created from a timesheet (`fromTimesheet`). No toggle; uses the resolved default. Its description suffix reflects the unit (`member — 90m` / `member — 1.5h`).

### Import amount accuracy
A line item's `amount` is always derived from the **exact duration** (`durationMinutes / 60 × hourlyRate`, rounded to 2 dp), independent of the displayed unit or the rounded per-minute `unitPrice`. This keeps invoice totals identical regardless of the import unit and free of per-minute rounding drift. Note: the invoice editor recomputes `amount = quantity × unitPrice` (4 dp) when a user manually edits a row, so the duration-derived value is authoritative only until a row is hand-edited — sub-cent and invisible at the PDF's 2-dp display.

### Custom Field Value
The user-supplied data for one custom field on one time entry. Values are stored on `time_entries` in a single `custom_values jsonb` column shaped `{fieldId: value}` (value is the raw scalar — string, number, boolean, or ISO date/time depending on the field type). Validation lives in the app layer (Zod) using the field definition. Deleting a field removes its key from every entry's `custom_values` via a single `UPDATE … SET custom_values = custom_values - $fieldId` over the affected scope.
