ALTER TABLE "requirement_threads" RENAME TO "threads";--> statement-breakpoint
ALTER TABLE "thread_messages" DROP CONSTRAINT "thread_messages_thread_id_requirement_threads_id_fk";
--> statement-breakpoint
ALTER TABLE "threads" DROP CONSTRAINT "requirement_threads_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "threads" DROP CONSTRAINT "requirement_threads_created_by_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_created_by_member_id_members_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;