ALTER TABLE "timesheet_reports" DROP CONSTRAINT "timesheet_reports_client_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "timesheet_reports" DROP COLUMN "client_member_id";