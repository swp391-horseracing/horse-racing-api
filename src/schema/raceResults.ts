import { pgTable, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { races } from "./races.js";
import { users } from "./users.js";

export const resultStatusEnums = pgEnum("result_status", [
    "draft",
    "referee_confirmed",
    "published",
]);

export const raceResults = pgTable("race_results", {
    id: uuid("id").defaultRandom().primaryKey(),
    raceId: uuid("race_id")
        .references(() => races.id)
        .notNull(),
    resultStatus: resultStatusEnums("result_status").default("draft").notNull(),
    refereeConfirmedBy: uuid("referee_confirmed_by").references(() => users.id),
    refereeConfirmedAt: timestamp("referee_confirmed_at"),
    publishedBy: uuid("published_by").references(() => users.id),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
