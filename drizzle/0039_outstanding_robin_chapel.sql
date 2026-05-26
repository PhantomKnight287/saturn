ALTER TABLE "member_rates" ADD COLUMN "billing_frequency" "billing_frequency" DEFAULT 'hourly';--> statement-breakpoint
ALTER TABLE "member_rates" ADD COLUMN "pay_frequency" "billing_frequency" DEFAULT 'hourly';--> statement-breakpoint
ALTER TABLE "pending_member_rates" ADD COLUMN "billing_frequency" "billing_frequency" DEFAULT 'hourly';--> statement-breakpoint
ALTER TABLE "pending_member_rates" ADD COLUMN "pay_frequency" "billing_frequency" DEFAULT 'hourly';