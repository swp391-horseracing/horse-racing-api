CREATE TYPE "public"."registration_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "tournament_registrations" (
	"registration_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"horse_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"status" "registration_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"reject_reason" varchar(500),
	CONSTRAINT "tournament_registrations_tournament_id_horse_id_unique" UNIQUE("tournament_id","horse_id")
);
--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_horse_id_horses_id_fk" FOREIGN KEY ("horse_id") REFERENCES "public"."horses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
