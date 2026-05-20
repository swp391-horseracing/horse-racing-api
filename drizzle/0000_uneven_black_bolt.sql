CREATE TYPE "public"."roles" AS ENUM('horse_owner', 'jockey', 'referee', 'spectator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."statis" AS ENUM('pending', 'active', 'locked');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"phone" varchar(15) NOT NULL,
	"address" varchar(225),
	"avatar_url" text,
	"role" "roles",
	"status" "statis",
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
