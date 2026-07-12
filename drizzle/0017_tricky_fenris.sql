ALTER TABLE "race_result_entries" DROP CONSTRAINT "race_result_entries_violation_id_violations_id_fk";
--> statement-breakpoint
ALTER TABLE "race_result_entries" ADD COLUMN "base_points" integer;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "violation_type_config_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "points_deducted" integer;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "previous_finish_status" "finish_status";--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_violation_type_config_id_violation_type_config_id_fk" FOREIGN KEY ("violation_type_config_id") REFERENCES "public"."violation_type_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_result_entries" DROP COLUMN "previous_points";--> statement-breakpoint
ALTER TABLE "race_result_entries" DROP COLUMN "previous_finish_status";--> statement-breakpoint
ALTER TABLE "race_result_entries" DROP COLUMN "violation_id";--> statement-breakpoint
ALTER TABLE "violations" DROP COLUMN "violation_type";--> statement-breakpoint
ALTER TABLE "violations" DROP COLUMN "description";