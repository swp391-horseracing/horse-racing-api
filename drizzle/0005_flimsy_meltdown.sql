CREATE TYPE "public"."finish_status" AS ENUM('finished', 'dnf', 'dsq', 'dns');--> statement-breakpoint
CREATE TYPE "public"."result_status" AS ENUM('draft', 'referee_confirmed', 'published');--> statement-breakpoint
CREATE TABLE "race_result_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"finished_position" integer,
	"finish_time" numeric(8, 3),
	"finish_status" "finish_status" DEFAULT 'finished',
	"points" integer DEFAULT 0 NOT NULL,
	"violation_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "race_result_entries_result_id_entry_id_unique" UNIQUE("result_id","entry_id"),
	CONSTRAINT "race_result_entries_result_id_finished_position_unique" UNIQUE("result_id","finished_position")
);
--> statement-breakpoint
CREATE TABLE "race_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_id" uuid NOT NULL,
	"result_status" "result_status" DEFAULT 'draft' NOT NULL,
	"referee_confirmed_by" uuid,
	"referee_confirmed_at" timestamp,
	"published_by" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "violations" DROP CONSTRAINT "violations_race_id_races_id_fk";
--> statement-breakpoint
ALTER TABLE "race_result_entries" ADD CONSTRAINT "race_result_entries_result_id_race_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."race_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_result_entries" ADD CONSTRAINT "race_result_entries_entry_id_race_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."race_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_result_entries" ADD CONSTRAINT "race_result_entries_violation_id_violations_id_fk" FOREIGN KEY ("violation_id") REFERENCES "public"."violations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_referee_confirmed_by_users_id_fk" FOREIGN KEY ("referee_confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" DROP COLUMN "race_id";