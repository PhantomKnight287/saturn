ALTER TABLE "settings" RENAME COLUMN "member_rate" TO "pay_rate";--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "currency" TO "pay_currency";--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "billing_rate" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "billing_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "billing_frequency" "billing_frequency" DEFAULT 'hourly';--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "pay_frequency" "billing_frequency" DEFAULT 'hourly';