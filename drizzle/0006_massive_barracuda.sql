CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spectator_id" uuid NOT NULL,
	"race_id" uuid NOT NULL,
	"predicted_1st_entry_id" uuid NOT NULL,
	"predicted_2nd_entry_id" uuid NOT NULL,
	"predicted_3rd_entry_id" uuid NOT NULL,
	"placed_at" timestamp DEFAULT now() NOT NULL,
	"is_correct" boolean,
	"reward_amount" numeric(15, 2),
	CONSTRAINT "uq_spectator_race" UNIQUE("spectator_id","race_id"),
	CONSTRAINT "chk_distinct_predictions" CHECK ("predictions"."predicted_1st_entry_id" <> "predictions"."predicted_2nd_entry_id"
                AND "predictions"."predicted_2nd_entry_id" <> "predictions"."predicted_3rd_entry_id"
                AND "predictions"."predicted_1st_entry_id" <> "predictions"."predicted_3rd_entry_id")
);
--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_spectator_id_users_id_fk" FOREIGN KEY ("spectator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_predicted_1st_entry_id_race_id_race_entries_id_race_id_fk" FOREIGN KEY ("predicted_1st_entry_id","race_id") REFERENCES "public"."race_entries"("id","race_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_predicted_2nd_entry_id_race_id_race_entries_id_race_id_fk" FOREIGN KEY ("predicted_2nd_entry_id","race_id") REFERENCES "public"."race_entries"("id","race_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_predicted_3rd_entry_id_race_id_race_entries_id_race_id_fk" FOREIGN KEY ("predicted_3rd_entry_id","race_id") REFERENCES "public"."race_entries"("id","race_id") ON DELETE no action ON UPDATE no action;