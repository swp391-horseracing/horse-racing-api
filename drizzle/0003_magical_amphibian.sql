CREATE TYPE "public"."registration_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
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
	CONSTRAINT "tournament_registrations_tournament_id_horse_id_unique" UNIQUE("tournament_id","horse_id"),
	CONSTRAINT "tournament_registrations_review_state_ck" CHECK (("tournament_registrations"."status" = 'pending' AND "tournament_registrations"."reviewed_by" IS NULL AND "tournament_registrations"."reviewed_at" IS NULL AND "tournament_registrations"."reject_reason" IS NULL) OR ("tournament_registrations"."status" = 'approved' AND "tournament_registrations"."reviewed_by" IS NOT NULL AND "tournament_registrations"."reviewed_at" IS NOT NULL AND "tournament_registrations"."reject_reason" IS NULL) OR ("tournament_registrations"."status" = 'rejected' AND "tournament_registrations"."reviewed_by" IS NOT NULL AND "tournament_registrations"."reviewed_at" IS NOT NULL AND "tournament_registrations"."reject_reason" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "jockey_invitations" (
	"invitation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_id" uuid NOT NULL,
	"horse_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"jockey_id" uuid NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	CONSTRAINT "jockey_invitations_response_state_ck" CHECK (("jockey_invitations"."status" = 'pending' AND "jockey_invitations"."responded_at" IS NULL) OR ("jockey_invitations"."status" IN ('accepted', 'declined', 'cancelled') AND "jockey_invitations"."responded_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_horse_id_horses_id_fk" FOREIGN KEY ("horse_id") REFERENCES "public"."horses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jockey_invitations" ADD CONSTRAINT "jockey_invitations_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jockey_invitations" ADD CONSTRAINT "jockey_invitations_horse_id_horses_id_fk" FOREIGN KEY ("horse_id") REFERENCES "public"."horses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jockey_invitations" ADD CONSTRAINT "jockey_invitations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jockey_invitations" ADD CONSTRAINT "jockey_invitations_jockey_id_users_id_fk" FOREIGN KEY ("jockey_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;