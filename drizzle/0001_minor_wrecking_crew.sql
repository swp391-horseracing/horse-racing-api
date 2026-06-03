ALTER TYPE "public"."race_status" ADD VALUE 'draft' BEFORE 'scheduled';--> statement-breakpoint
ALTER TYPE "public"."race_status" ADD VALUE 'under_review' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."race_status" ADD VALUE 'result_confirmed' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."race_status" ADD VALUE 'postponed' BEFORE 'cancelled';
