import { pgTable, uuid, decimal, smallint } from "drizzle-orm/pg-core";
import { users } from "./users";

export const jockeyProfile = pgTable("jockey_profile", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    weightKg: decimal({ precision: 5, scale: 2 }).notNull(),
    experienceYear: smallint("experience_year").notNull(),
});
