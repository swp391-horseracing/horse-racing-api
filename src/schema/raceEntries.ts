import {
    pgTable,
    timestamp,
    uuid,
    pgEnum,
    integer,
    unique,
} from "drizzle-orm/pg-core";
import { races } from "./races.js";
import { horses } from "./horses.js";
import { users } from "./users.js";

export const entryStatusEnums = pgEnum("entry_status", [
    "pending",
    "confirmed",
    "scratched",
    "withdrawn",
    "did_not_finish",
    "disqualified",
]);

export const raceEntries = pgTable(
    "race_entries",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        raceId: uuid("race_id")
            .references(() => races.id)
            .notNull(),
        horseId: uuid("horse_id")
            .references(() => horses.id)
            .notNull(),
        jockeyId: uuid("jockey_id").references(() => users.id),
        laneNumber: integer("lane_number").notNull(),
        entryStatus: entryStatusEnums("entry_status").notNull(),
        confirmedAt: timestamp("confirmed_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        unique().on(table.raceId, table.horseId),
        unique().on(table.raceId, table.jockeyId),
        unique().on(table.raceId, table.laneNumber),
    ],
);
