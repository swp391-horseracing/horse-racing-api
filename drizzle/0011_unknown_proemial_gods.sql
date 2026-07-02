DROP INDEX "uq_referee_race_idx";--> statement-breakpoint
ALTER TABLE "jockey_invitations" ADD COLUMN "title" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_referee_race_idx" ON "referee_assignments" USING btree ("race_id","referee_id");