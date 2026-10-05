CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'TODO' NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"estimated_hours" real,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_type_check" CHECK ("tasks"."type" in ('ASSIGNMENT','EXAM','PROJECT','PERSONAL')),
	CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('TODO','IN_PROGRESS','COMPLETED')),
	CONSTRAINT "tasks_progress_percent_check" CHECK ("tasks"."progress_percent" between 0 and 100),
	CONSTRAINT "tasks_estimated_hours_check" CHECK ("tasks"."estimated_hours" is null or "tasks"."estimated_hours" > 0),
	CONSTRAINT "tasks_weight_check" CHECK ("tasks"."weight" >= 0),
	CONSTRAINT "tasks_completed_progress_check" CHECK (("tasks"."status" <> 'COMPLETED' or "tasks"."progress_percent" = 100) and ("tasks"."progress_percent" <> 100 or "tasks"."status" = 'COMPLETED'))
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_user_id_due_date_idx" ON "tasks" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "tasks_user_id_status_idx" ON "tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_course_id_idx" ON "tasks" USING btree ("course_id");