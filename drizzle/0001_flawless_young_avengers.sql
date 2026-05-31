ALTER TABLE "races" DROP CONSTRAINT "races_id_tournaments_id_fk";
--> statement-breakpoint
ALTER TABLE "races" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "races" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "races" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "tournament_id" uuid;--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;