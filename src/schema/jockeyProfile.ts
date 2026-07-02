import { pgTable, uuid, decimal, smallint } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const jockeyProfile = pgTable("jockey_profile", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    weightKg: decimal("weight_kg", {
        precision: 5,
        scale: 2,
        mode: "number",
    }).notNull(),
    experienceYear: smallint("experience_year").notNull(),
});
