CREATE TYPE "public"."invoice_recipient" AS ENUM('member', 'client');--> statement-breakpoint
ALTER TABLE "invoice_recipients" RENAME COLUMN "client_member_id" TO "member_id";--> statement-breakpoint
ALTER TABLE "invoice_recipients" DROP CONSTRAINT "invoice_recipients_client_member_id_invoice_id_unique";--> statement-breakpoint
ALTER TABLE "invoice_recipients" DROP CONSTRAINT "invoice_recipients_client_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "recipient" "invoice_recipient" DEFAULT 'client';--> statement-breakpoint
ALTER TABLE "invoice_recipients" ADD CONSTRAINT "invoice_recipients_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_recipients" ADD CONSTRAINT "invoice_recipients_member_id_invoice_id_unique" UNIQUE("member_id","invoice_id");