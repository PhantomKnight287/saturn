ALTER TABLE "invoices" ALTER COLUMN "due_date" SET DATA TYPE date USING ("due_date" AT TIME ZONE 'UTC')::date;
