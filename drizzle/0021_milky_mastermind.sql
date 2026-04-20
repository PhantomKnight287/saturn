CREATE TYPE "public"."client_involvement" AS ENUM('full', 'partial', 'none');--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "default_member_rate" TO "member_rate";--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "default_currency" TO "currency";--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "default_timesheet_duration" TO "timesheet_duration";--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "client_involvement" "client_involvement" DEFAULT 'full' NOT NULL;