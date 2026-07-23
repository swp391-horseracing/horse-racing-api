ALTER TABLE "predictions" ADD COLUMN "stake_amount" integer;--> statement-breakpoint
ALTER TABLE "race_configs" ADD COLUMN "prediction_min_stake" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "race_configs" DROP COLUMN "prediction_reward_points";