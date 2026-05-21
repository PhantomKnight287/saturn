ALTER TABLE "settings" RENAME COLUMN "invoice_billing_name" TO "invoice_from_name";--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "invoice_billing_address" TO "invoice_from_address";--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "invoice_to_name" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "invoice_to_address" text;