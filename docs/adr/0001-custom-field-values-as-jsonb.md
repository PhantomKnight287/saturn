# Store timesheet custom field values as JSONB on `time_entries`

Custom fields ([issue #32](https://github.com/PhantomKnight287/saturn/issues/32)) let admins configure extra fields on the timesheet form at org and project scope. We store each entry's submitted values in a single `custom_values jsonb` column on `time_entries`, shaped `{fieldId: value}`, rather than a normalized side table (e.g., `time_entry_custom_values(entity_id, field_id, value)`).

## Considered Options

- **Normalized EAV table.** One row per filled field per entry, FK to both `time_entries` and the field definition. Strictly correct, makes filter/group-by ("hours where Category = 'Design'") a straightforward join, and the field-deletion cascade is a single FK rule.
- **JSONB column on `time_entries`** (chosen). One column, no joins on read, no migration when types are added. Field-deletion cascade is `UPDATE time_entries SET custom_values = custom_values - $fieldId` over the affected scope.

## Why JSONB

v1 ships **display only** — values are persisted, rendered on the form, and shown read-only on entry views. There is no filter UI, no group-by, no aggregation. Under that constraint, the join table earns its complexity nowhere: every read path is "load the entry, render the values," which JSON serves with zero ceremony.

## Consequences

- **Reporting/filtering carries a cost we have not paid yet.** When filterable reports ship, queries will use `custom_values->>'fld_xyz'` and will be unindexed unless we add per-field expression indexes. At a sufficiently large scale, the right move is to migrate to a normalized table. The trigger is product, not engineering — when filtering ships, revisit.
- **Field IDs are stable.** Renaming or editing constraints does not touch stored values. Orphaned keys (left behind if a deletion sweep is ever missed) are harmless: the UI ignores keys without a current definition.
- **Validation lives entirely in the app layer** (Zod, against the current field definition). Postgres enforces nothing about the JSON shape.
