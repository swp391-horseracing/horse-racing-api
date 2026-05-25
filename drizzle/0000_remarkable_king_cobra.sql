CREATE TYPE "public"."roles" AS ENUM('horse_owner', 'jockey', 'referee', 'spectator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'active', 'locked');--> statement-breakpoint
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
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
