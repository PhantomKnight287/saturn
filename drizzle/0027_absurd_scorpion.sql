CREATE TYPE "public"."expense_recipient_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "expense_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"client_member_id" text NOT NULL,
	"status" "expense_recipient_status" DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expense_recipients_expense_id_client_member_id_unique" UNIQUE("expense_id","client_member_id")
);
--> statement-breakpoint
ALTER TABLE "expense_recipients" ADD CONSTRAINT "expense_recipients_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_recipients" ADD CONSTRAINT "expense_recipients_client_member_id_members_id_fk" FOREIGN KEY ("client_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_recipients_expense_id_idx" ON "expense_recipients" USING btree ("expense_id");