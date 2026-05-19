# Saturn — Domain Context

## Glossary

### Custom Field (timesheet)
A configurable extra field that appears on the timesheet entry form, defined at organization or project scope.

- **Identity** — each field has a stable, randomly generated ID. The ID never changes; label, type constraints (e.g., required), default value, and options are mutable in place.
- **Historical entries** — because entries reference fields by ID, renaming a field or relaxing a constraint retroactively re-labels/re-validates old values; entries are not snapshotted.
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
No manual reordering in v1. Fields render in `createdAt` ascending order, both in settings UIs and on the timesheet form. No `position` column is required on field-definition tables.

### Permissions
- **Org-level field defs**: managed (create/edit/delete) by owner + admin only.
- **Project-level field defs**: managed by owner + admin only (no per-project "lead" role exists in Saturn).
- **Members**: see and fill the form; cannot manage definitions.
- **Clients**: never see field definitions; only see rendered values for fields with `visibleToClient = true` on artifacts shared with them.

### Client visibility
Each field definition carries a `visibleToClient` boolean, default `false`. Custom field values are hidden from client-facing surfaces (shared timesheet reports, invoices) unless opted in per field.

### Display of custom values
Internal read surfaces (timesheet list/detail rows for members and admins) render custom values inline read-only via `CustomValuesInline`. Client-facing read surfaces (shared timesheet reports, invoices) are **deferred** — the current report/invoice flow needs a broader UX restructure for non-technical users; pinning a display treatment on top of the existing flow would bake in decisions that will be redone.

### Constraint changes on existing fields
Constraint edits (label, required, default, dropdown options, etc.) are always allowed at the definition level. Validation is **enforce-on-write, never on read**:

- Reads of historical entries always succeed regardless of current constraints.
- Any write (create or edit) to a time entry validates `custom_values` against the *current* field definition. A member editing an old entry may be forced to fill a newly-required field before saving.
- The field editor does not pre-compute or warn about impact on existing data in v1. Admins are trusted; consequences surface to members on their next edit. Revisit if it becomes a support issue.
- **Field type is immutable after creation.** To change a type, delete the field (cascading its values) and create a new one.

### Custom Field Value
The user-supplied data for one custom field on one time entry. Values are stored on `time_entries` in a single `custom_values jsonb` column shaped `{fieldId: value}` (value is the raw scalar — string, number, boolean, ISO date, or media id depending on the field type). Validation lives in the app layer (Zod) using the field definition. Deleting a field removes its key from every entry's `custom_values` via a single `UPDATE … SET custom_values = custom_values - $fieldId` over the affected scope.
