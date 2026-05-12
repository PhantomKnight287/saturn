ALTER TABLE "projects" DROP CONSTRAINT "projects_slug_unique";--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_slug_unique" UNIQUE("organization_id","slug");