CREATE TABLE "proposal_deliverables" (
	"id" text PRIMARY KEY NOT NULL,
	"proposal_id" text NOT NULL,
	"title" text NOT NULL,
	"quantity" numeric(10, 4) NOT NULL,
	"unit_price" numeric(16, 4) NOT NULL,
	"amount" numeric(16, 4) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"proposal_id" text NOT NULL,
	"client_member_id" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_signatures" (
	"id" text PRIMARY KEY NOT NULL,
	"proposal_id" text NOT NULL,
	"client_member_id" text NOT NULL,
	"media_id" text,
	"signed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"author_id" text,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"terms" text,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"valid_until" timestamp,
	"currency" text DEFAULT 'USD' NOT NULL,
	"total_amount" numeric(16, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "thread_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"author_member_id" text,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"project_id" text NOT NULL,
	"selected_text" text NOT NULL,
	"status" "thread_status" DEFAULT 'open' NOT NULL,
	"created_by_member_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposal_deliverables" ADD CONSTRAINT "proposal_deliverables_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_recipients" ADD CONSTRAINT "proposal_recipients_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_recipients" ADD CONSTRAINT "proposal_recipients_client_member_id_members_id_fk" FOREIGN KEY ("client_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_signatures" ADD CONSTRAINT "proposal_signatures_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_signatures" ADD CONSTRAINT "proposal_signatures_client_member_id_members_id_fk" FOREIGN KEY ("client_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_signatures" ADD CONSTRAINT "proposal_signatures_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_thread_id_requirement_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."requirement_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_author_member_id_members_id_fk" FOREIGN KEY ("author_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_threads" ADD CONSTRAINT "requirement_threads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_threads" ADD CONSTRAINT "requirement_threads_created_by_member_id_members_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposals_project_id_idx" ON "proposals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "threads_project_id_idx" ON "requirement_threads" USING btree ("project_id");