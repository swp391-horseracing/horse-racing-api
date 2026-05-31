ALTER TABLE "referee_assignments" DROP CONSTRAINT "referee_assignments_race_id_unique";--> statement-breakpoint
ALTER TABLE "referee_assignments" DROP CONSTRAINT "referee_assignments_referee_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_referee_race_idx" ON "referee_assignments" USING btree ("race_id","referee_id");