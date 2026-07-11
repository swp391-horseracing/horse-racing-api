DROP INDEX "uq_referee_race_idx";--> statement-breakpoint
ALTER TABLE "referee_assignments" ADD CONSTRAINT "referee_assignments_race_referee_unique" UNIQUE("race_id","referee_id");