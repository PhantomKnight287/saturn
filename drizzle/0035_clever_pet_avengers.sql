CREATE TYPE "public"."invoice_time_unit" AS ENUM('hours', 'minutes');--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "invoice_time_unit" "invoice_time_unit" DEFAULT 'hours' NOT NULL;