CREATE TYPE "public"."horse_sex" AS ENUM('male', 'female', 'gelding');--> statement-breakpoint
ALTER TABLE "horses" ADD COLUMN "sex" "horse_sex";--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "min_age" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "max_age" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "sex" "horse_sex";--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "carry_weight" numeric(6, 2);