CREATE TABLE "pending_member_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"invitation_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"hourly_rate" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pending_member_rates_invitation_id_unique" UNIQUE("invitation_id")
);
--> statement-breakpoint
CREATE INDEX "pending_member_rates_org_email_idx" ON "pending_member_rates" USING btree ("organization_id","email");