CREATE TYPE "public"."roles" AS ENUM('horse_owner', 'jockey', 'referee', 'spectator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'active', 'locked');--> statement-breakpoint
CREATE TYPE "public"."race_status" AS ENUM('scheduled', 'pre_race', 'ongoing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."round" AS ENUM('qualifier', 'semifinal', 'final');--> statement-breakpoint
CREATE TYPE "public"."track_condition" AS ENUM('dry', 'wet', 'muddy');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('upcoming', 'registration_open', 'ongoing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "horses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"name" varchar(255) NOT NULL,
	"breed" varchar(255) NOT NULL,
	"birth_date" date,
	"weight_kg" numeric(6, 2),
	"image_url" varchar(255),
	"health_status" varchar(255),
	"isRetired" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "horses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"phone" varchar(15),
	"address" varchar(225),
	"avatar_url" text,
	"role" "roles" NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "jockey_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"experience_year" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"reference_id" varchar(50) NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "races" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid,
	"name" varchar(255) NOT NULL,
	"race_number" integer NOT NULL,
	"round" "round" NOT NULL,
	"distance_meters" integer NOT NULL,
	"track_condition" "track_condition" NOT NULL,
	"schedule_at" timestamp NOT NULL,
	"venue" varchar(255) NOT NULL,
	"lane_count" integer NOT NULL,
	"status" "race_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referee_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"rules" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"registration_deadline" timestamp NOT NULL,
	"status" "tournament_status",
	"created_by" uuid,
	"createdAt" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "horses" ADD CONSTRAINT "horses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jockey_profile" ADD CONSTRAINT "jockey_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referee_assignments" ADD CONSTRAINT "referee_assignments_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referee_assignments" ADD CONSTRAINT "referee_assignments_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referee_assignments" ADD CONSTRAINT "referee_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_referee_race_idx" ON "referee_assignments" USING btree ("race_id","referee_id");