ALTER TABLE "apikeys" ALTER COLUMN "rate_limit_time_window" SET DEFAULT 60000;--> statement-breakpoint
ALTER TABLE "apikeys" ALTER COLUMN "rate_limit_max" SET DEFAULT 120;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text;