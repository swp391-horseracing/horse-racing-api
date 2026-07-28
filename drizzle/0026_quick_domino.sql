ALTER TABLE "race_configs" ADD COLUMN "first_place_points" integer DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE "race_configs" ADD COLUMN "second_place_points" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "race_configs" ADD COLUMN "third_place_points" integer DEFAULT 7 NOT NULL;