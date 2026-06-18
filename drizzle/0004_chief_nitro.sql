CREATE TYPE "public"."violation_severity" AS ENUM('warning', 'disqualification', 'result_cancellation', 'point_deduction');--> statement-breakpoint
CREATE TABLE "violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"violation_type" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"severity" "violation_severity" NOT NULL,
	"note" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_entry_id_race_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."race_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "races" DROP COLUMN "round_number";--> statement-breakpoint
ALTER TABLE "races" DROP COLUMN "round";