ALTER TABLE "race_entries" ALTER COLUMN "confirmed_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "race_entries" ALTER COLUMN "confirmed_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "race_entries" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "open_close_date_check" CHECK ("tournaments"."registration_open_date" < "tournaments"."registration_close_date");