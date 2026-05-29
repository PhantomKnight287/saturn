CREATE TABLE "invoice_conversion_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" numeric(24, 12) NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_conversion_rates_invoice_id_from_currency_to_currency_unique" UNIQUE("invoice_id","from_currency","to_currency")
);
--> statement-breakpoint
ALTER TABLE "invoice_conversion_rates" ADD CONSTRAINT "invoice_conversion_rates_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;