ALTER TABLE "predictions" DROP CONSTRAINT "chk_distinct_predictions";--> statement-breakpoint
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_predicted_1st_entry_id_race_id_race_entries_id_race_id_fk";
--> statement-breakpoint
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_predicted_2nd_entry_id_race_id_race_entries_id_race_id_fk";
--> statement-breakpoint
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_predicted_3rd_entry_id_race_id_race_entries_id_race_id_fk";
--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "predicted_entry_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "predicted_position" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_predicted_entry_id_race_id_race_entries_id_race_id_fk" FOREIGN KEY ("predicted_entry_id","race_id") REFERENCES "public"."race_entries"("id","race_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" DROP COLUMN "predicted_1st_entry_id";--> statement-breakpoint
ALTER TABLE "predictions" DROP COLUMN "predicted_2nd_entry_id";--> statement-breakpoint
ALTER TABLE "predictions" DROP COLUMN "predicted_3rd_entry_id";--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "chk_predicted_position" CHECK ("predictions"."predicted_position" BETWEEN 1 AND 3);