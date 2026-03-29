CREATE TYPE "public"."timesheet_duration" AS ENUM('weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"default_member_rate" integer DEFAULT 0 NOT NULL,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"default_timesheet_duration" timesheet_duration DEFAULT 'weekly' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_settings_org_project_unique" ON "organization_settings" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_settings_org_only_unique" ON "organization_settings" USING btree ("organization_id") WHERE "organization_settings"."project_id" IS NULL;--> statement-breakpoint
CREATE INDEX "org_settings_org_id_idx" ON "organization_settings" USING btree ("organization_id");