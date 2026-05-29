ALTER TABLE "expenses" ALTER COLUMN "date" SET DATA TYPE date USING ("date" AT TIME ZONE 'UTC')::date;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "issue_date" SET DATA TYPE date USING ("issue_date" AT TIME ZONE 'UTC')::date;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "issue_date" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "due_date" SET DATA TYPE date USING ("due_date" AT TIME ZONE 'UTC')::date;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "due_date" SET DATA TYPE date USING ("due_date" AT TIME ZONE 'UTC')::date;--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "valid_until" SET DATA TYPE date USING ("valid_until" AT TIME ZONE 'UTC')::date;--> statement-breakpoint
DROP INDEX IF EXISTS "member_rate_effective_unique";--> statement-breakpoint
ALTER TABLE "member_rates" ALTER COLUMN "effective_from" SET DATA TYPE date USING ("effective_from" AT TIME ZONE 'UTC')::date;--> statement-breakpoint
ALTER TABLE "time_entries" ALTER COLUMN "date" SET DATA TYPE date USING ("date" AT TIME ZONE 'UTC')::date;
