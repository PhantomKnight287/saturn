CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'disputed', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."timesheet_report_status" AS ENUM('draft', 'sent', 'approved', 'disputed');--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 4) NOT NULL,
	"unit_price" numeric(16, 4) NOT NULL,
	"amount" numeric(16, 4) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"client_member_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"requirement_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp,
	"notes" text,
	"total_amount" numeric(16, 4) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"sender_logo" text,
	"sender_signature" text,
	"sender_name" text,
	"sender_address" text,
	"sender_custom_fields" jsonb,
	"client_name" text,
	"client_address" text,
	"client_custom_fields" jsonb,
	"payment_terms" text,
	"terms" text,
	"discount_label" text,
	"discount_amount" numeric(16, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "member_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"project_id" text,
	"hourly_rate" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"effective_from" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"budget_minutes" integer NOT NULL,
	"alert_threshold" integer DEFAULT 80 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_budgets_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"requirement_id" text,
	"member_id" text NOT NULL,
	"description" text NOT NULL,
	"date" timestamp NOT NULL,
	"duration_minutes" integer NOT NULL,
	"billable" boolean DEFAULT true NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"reject_reason" text,
	"invoice_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheet_report_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"time_entry_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheet_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"status" timesheet_report_status DEFAULT 'draft' NOT NULL,
	"total_minutes" integer NOT NULL,
	"total_amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"sent_by_member_id" text,
	"client_member_id" text NOT NULL,
	"dispute_reason" text,
	"sent_at" timestamp,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_recipients" ADD CONSTRAINT "invoice_recipients_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_recipients" ADD CONSTRAINT "invoice_recipients_client_member_id_members_id_fk" FOREIGN KEY ("client_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_requirements" ADD CONSTRAINT "invoice_requirements_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_requirements" ADD CONSTRAINT "invoice_requirements_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sender_logo_media_id_fk" FOREIGN KEY ("sender_logo") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sender_signature_media_id_fk" FOREIGN KEY ("sender_signature") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_rates" ADD CONSTRAINT "member_rates_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_rates" ADD CONSTRAINT "member_rates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_report_entries" ADD CONSTRAINT "timesheet_report_entries_report_id_timesheet_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."timesheet_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_report_entries" ADD CONSTRAINT "timesheet_report_entries_time_entry_id_time_entries_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "public"."time_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_reports" ADD CONSTRAINT "timesheet_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_reports" ADD CONSTRAINT "timesheet_reports_sent_by_member_id_members_id_fk" FOREIGN KEY ("sent_by_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_reports" ADD CONSTRAINT "timesheet_reports_client_member_id_members_id_fk" FOREIGN KEY ("client_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_project_id_status_idx" ON "invoices" USING btree ("project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "member_rate_effective_unique" ON "member_rates" USING btree ("member_id","project_id","effective_from");--> statement-breakpoint
CREATE INDEX "time_entries_project_id_status_idx" ON "time_entries" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "time_entries_member_id_idx" ON "time_entries" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "timesheet_report_entries_report_id_idx" ON "timesheet_report_entries" USING btree ("report_id");