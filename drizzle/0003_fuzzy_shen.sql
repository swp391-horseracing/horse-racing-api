ALTER TABLE "races" ALTER COLUMN "round" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."round";--> statement-breakpoint
CREATE TYPE "public"."round" AS ENUM('qualifier', 'semifinal', 'final');--> statement-breakpoint
ALTER TABLE "races" ALTER COLUMN "round" SET DATA TYPE "public"."round" USING "round"::"public"."round";