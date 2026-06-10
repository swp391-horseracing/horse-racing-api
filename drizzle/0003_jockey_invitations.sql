CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
CREATE TABLE "jockey_invitations" (
	"invitation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_id" uuid NOT NULL,
	"horse_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"jockey_id" uuid NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "jockey_invitations" ADD CONSTRAINT "jockey_invitations_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jockey_invitations" ADD CONSTRAINT "jockey_invitations_horse_id_horses_id_fk" FOREIGN KEY ("horse_id") REFERENCES "public"."horses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jockey_invitations" ADD CONSTRAINT "jockey_invitations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jockey_invitations" ADD CONSTRAINT "jockey_invitations_jockey_id_users_id_fk" FOREIGN KEY ("jockey_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
