ALTER TABLE "settings" ALTER COLUMN "pay_frequency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "member_rates" ALTER COLUMN "pay_frequency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_member_rates" ALTER COLUMN "pay_frequency" SET NOT NULL;