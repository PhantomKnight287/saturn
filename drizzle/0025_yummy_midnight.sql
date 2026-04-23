ALTER TABLE "media" DROP CONSTRAINT "media_uploaded_by_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "organization_id";--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "uploaded_by_member_id";