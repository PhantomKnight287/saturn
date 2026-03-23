CREATE TYPE "public"."change_request_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'submitted_to_admin', 'admin_accepted', 'admin_rejected', 'submitted_to_client', 'client_accepted', 'client_rejected', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."thread_status" AS ENUM('open', 'resolved', 'closed');--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"uploaded_by_member_id" text,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "requirement_change_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"requested_by_member_id" text,
	"description" text NOT NULL,
	"referenced_thread_ids" text[],
	"status" "change_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "requirement_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"client_member_id" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_signatures" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"client_member_id" text NOT NULL,
	"signed_at" timestamp DEFAULT now() NOT NULL,
	"media_id" text
);
--> statement-breakpoint
CREATE TABLE "requirement_thread_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"author_member_id" text,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"selected_text" text NOT NULL,
	"context_before" text,
	"context_after" text,
	"status" "thread_status" DEFAULT 'open' NOT NULL,
	"created_by_member_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"author_id" text,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "requirements_project_id_slug_unique" UNIQUE("project_id","slug")
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_member_id_members_id_fk" FOREIGN KEY ("uploaded_by_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_change_requests" ADD CONSTRAINT "requirement_change_requests_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_change_requests" ADD CONSTRAINT "requirement_change_requests_requested_by_member_id_members_id_fk" FOREIGN KEY ("requested_by_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_recipients" ADD CONSTRAINT "requirement_recipients_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_recipients" ADD CONSTRAINT "requirement_recipients_client_member_id_members_id_fk" FOREIGN KEY ("client_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_signatures" ADD CONSTRAINT "requirement_signatures_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_signatures" ADD CONSTRAINT "requirement_signatures_client_member_id_members_id_fk" FOREIGN KEY ("client_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_signatures" ADD CONSTRAINT "requirement_signatures_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_thread_messages" ADD CONSTRAINT "requirement_thread_messages_thread_id_requirement_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."requirement_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_thread_messages" ADD CONSTRAINT "requirement_thread_messages_author_member_id_members_id_fk" FOREIGN KEY ("author_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_threads" ADD CONSTRAINT "requirement_threads_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_threads" ADD CONSTRAINT "requirement_threads_created_by_member_id_members_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "requirement_threads_requirement_id_idx" ON "requirement_threads" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "requirements_project_id_idx" ON "requirements" USING btree ("project_id");