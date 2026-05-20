CREATE TYPE "public"."custom_field_type" AS ENUM('text', 'number', 'select', 'checkbox', 'date', 'datetime', 'time');--> statement-breakpoint
CREATE TABLE "custom_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"label" text NOT NULL,
	"type" "custom_field_type" NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"visible_to_client" boolean DEFAULT false NOT NULL,
	"default_value" text,
	"options" jsonb,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "custom_values" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_fields_project_idx" ON "custom_fields" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "custom_fields_organization_idx" ON "custom_fields" USING btree ("organization_id");