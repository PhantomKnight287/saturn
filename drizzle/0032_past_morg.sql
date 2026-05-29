CREATE TABLE "invoice_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"expense_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_expenses_invoice_id_expense_id_unique" UNIQUE("invoice_id","expense_id")
);
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_invoice_id_invoices_id_fk";
--> statement-breakpoint
ALTER TABLE "invoice_expenses" ADD CONSTRAINT "invoice_expenses_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_expenses" ADD CONSTRAINT "invoice_expenses_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_expenses_invoice_id_idx" ON "invoice_expenses" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_expenses_expense_id_idx" ON "invoice_expenses" USING btree ("expense_id");--> statement-breakpoint
INSERT INTO "invoice_expenses" ("id", "invoice_id", "expense_id")
SELECT 'iexp_' || gen_random_uuid()::text, "invoice_id", "id"
FROM "expenses"
WHERE "invoice_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "invoice_id";