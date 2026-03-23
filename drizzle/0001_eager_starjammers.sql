CREATE TYPE "public"."project_invitation_type" AS ENUM('member', 'client');--> statement-breakpoint
CREATE TABLE "project_client_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"member_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"invitation_id" text NOT NULL,
	"project_id" text NOT NULL,
	"type" "project_invitation_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_invitations_invitation_id_unique" UNIQUE("invitation_id")
);
--> statement-breakpoint
CREATE TABLE "project_member_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"member_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_team_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"team_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"organization_id" text NOT NULL,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "project_client_assignments" ADD CONSTRAINT "project_client_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_client_assignments" ADD CONSTRAINT "project_client_assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member_assignments" ADD CONSTRAINT "project_member_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member_assignments" ADD CONSTRAINT "project_member_assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_assignments" ADD CONSTRAINT "project_team_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_assignments" ADD CONSTRAINT "project_team_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_client_unique" ON "project_client_assignments" USING btree ("project_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_member_unique" ON "project_member_assignments" USING btree ("project_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_team_unique" ON "project_team_assignments" USING btree ("project_id","team_id");