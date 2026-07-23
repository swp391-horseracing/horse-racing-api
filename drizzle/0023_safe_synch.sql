CREATE TABLE "race_configs" (
	"race_id" uuid PRIMARY KEY NOT NULL,
	"predictions_enabled" boolean DEFAULT true NOT NULL,
	"prediction_reward_points" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "race_configs" ADD CONSTRAINT "race_configs_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE cascade ON UPDATE no action;