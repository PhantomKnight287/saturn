ALTER TABLE "settings" ALTER COLUMN "client_involvement" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "client_involvement" SET DATA TYPE jsonb USING (
  CASE "client_involvement"::text
    WHEN 'full' THEN '{"proposals":"on","requirements":"on","milestones":"on","timesheets":"on","expenses":"on","invoices":"on"}'::jsonb
    WHEN 'partial' THEN '{"proposals":"off","requirements":"off","milestones":"off","timesheets":"off","expenses":"off","invoices":"on"}'::jsonb
    WHEN 'none' THEN '{"proposals":"off","requirements":"off","milestones":"off","timesheets":"off","expenses":"off","invoices":"off"}'::jsonb
  END
);--> statement-breakpoint
DROP TYPE "public"."client_involvement";