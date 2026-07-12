CREATE TABLE "violation_type_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"violation_type" varchar(100) NOT NULL,
	"points_deducted" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "violation_type_config_violation_type_unique" UNIQUE("violation_type")
);
--> statement-breakpoint
ALTER TABLE "race_result_entries" ADD COLUMN "previous_points" integer;