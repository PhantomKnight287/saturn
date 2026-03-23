CREATE TYPE "public"."timesheet_report_recipient_status" AS ENUM('pending', 'approved', 'disputed');--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"is_archived" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"member_id" text NOT NULL,
	"category_id" text NOT NULL,
	"milestone_id" text,
	"title" text NOT NULL,
	"description" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"date" timestamp NOT NULL,
	"billable" boolean DEFAULT true NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"reject_reason" text,
	"receipt_media_id" text,
	"invoice_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "timesheet_reports" ALTER COLUMN "client_member_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "timesheet_report_recipients" ADD COLUMN "status" timesheet_report_recipient_status DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "timesheet_report_recipients" ADD COLUMN "dispute_reason" text;--> statement-breakpoint
ALTER TABLE "timesheet_report_recipients" ADD COLUMN "responded_at" timestamp;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_receipt_media_id_media_id_fk" FOREIGN KEY ("receipt_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_project_id_status_idx" ON "expenses" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "expenses_member_id_idx" ON "expenses" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "timesheet_report_recipients_report_id_idx" ON "timesheet_report_recipients" USING btree ("report_id");