CREATE TYPE "public"."course_status" AS ENUM('active', 'inactive', 'under_maintainance');--> statement-breakpoint
CREATE TYPE "public"."race_surfaces" AS ENUM('turf', 'dirt', 'synthetic');--> statement-breakpoint
CREATE TABLE "course_distances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"distance_meters" integer NOT NULL,
	CONSTRAINT "uq_course_distance" UNIQUE("course_id","distance_meters")
);
--> statement-breakpoint
CREATE TABLE "race_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(100) DEFAULT 'Vietnam' NOT NULL,
	"city" varchar(150) NOT NULL,
	"address" text,
	"surface_type" "race_surfaces" NOT NULL,
	"track_shape_id" uuid NOT NULL,
	"distance_meters" integer NOT NULL,
	"max_starting_positions" integer NOT NULL,
	"grandstand_capacity" integer NOT NULL,
	"status" "course_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_shapes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shape" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "track_shapes_shape_unique" UNIQUE("shape")
);
--> statement-breakpoint
DROP INDEX "uq_referee_race_idx";--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "course_distance_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "course_distances" ADD CONSTRAINT "course_distances_course_id_race_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."race_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_courses" ADD CONSTRAINT "race_courses_track_shape_id_track_shapes_id_fk" FOREIGN KEY ("track_shape_id") REFERENCES "public"."track_shapes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_course_distance_id_course_distances_id_fk" FOREIGN KEY ("course_distance_id") REFERENCES "public"."course_distances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_referee_race_idx" ON "referee_assignments" USING btree ("race_id");--> statement-breakpoint
ALTER TABLE "races" DROP COLUMN "distance_meters";--> statement-breakpoint
ALTER TABLE "races" DROP COLUMN "track_condition";--> statement-breakpoint
ALTER TABLE "races" DROP COLUMN "venue";--> statement-breakpoint
DROP TYPE "public"."track_condition";
