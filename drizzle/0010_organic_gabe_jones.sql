CREATE TABLE "timesheet_report_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"client_member_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "timesheet_report_recipients" ADD CONSTRAINT "timesheet_report_recipients_report_id_timesheet_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."timesheet_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_report_recipients" ADD CONSTRAINT "timesheet_report_recipients_client_member_id_members_id_fk" FOREIGN KEY ("client_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;