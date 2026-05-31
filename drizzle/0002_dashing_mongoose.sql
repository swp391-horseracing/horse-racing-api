ALTER TABLE "horses" DROP CONSTRAINT "horses_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "horses" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "horses" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "horses" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "horses" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "horses" ADD CONSTRAINT "horses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;