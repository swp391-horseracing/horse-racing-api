ALTER TABLE "tournaments" ALTER COLUMN "start_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "end_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "end_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "maximum_participants" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "minimum_participants" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "prize_pool" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "start_end_date_check" CHECK ("tournaments"."start_date" < "tournaments"."end_date");--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "max_min_part_check" CHECK ("tournaments"."maximum_participants" >= "tournaments"."minimum_participants");