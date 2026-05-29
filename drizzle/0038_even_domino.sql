CREATE TYPE "public"."billing_frequency" AS ENUM('weekly', 'biweekly', 'monthly', 'hourly');--> statement-breakpoint
ALTER TABLE "member_rates" RENAME COLUMN "hourly_rate" TO "pay_rate";--> statement-breakpoint
ALTER TABLE "member_rates" RENAME COLUMN "currency" TO "pay_currency";--> statement-breakpoint
ALTER TABLE "pending_member_rates" RENAME COLUMN "hourly_rate" TO "pay_rate";--> statement-breakpoint
ALTER TABLE "pending_member_rates" RENAME COLUMN "currency" TO "pay_currency";--> statement-breakpoint
ALTER TABLE "member_rates" ADD COLUMN "billing_rate" integer;--> statement-breakpoint
ALTER TABLE "member_rates" ADD COLUMN "billing_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_member_rates" ADD COLUMN "billing_rate" integer;--> statement-breakpoint
ALTER TABLE "pending_member_rates" ADD COLUMN "billing_currency" text DEFAULT 'USD' NOT NULL;