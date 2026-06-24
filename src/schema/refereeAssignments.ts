import { pgTable, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { races } from "./races.js";
import { users } from "./users.js";

export const refereeAssignments = pgTable(
    "referee_assignments",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        raceId: uuid("race_id")
            .references(() => races.id)
            .notNull(),
        refereeId: uuid("referee_id")
            .references(() => users.id)
            .notNull(),
        assignedBy: uuid("assigned_by")
            .references(() => users.id)
            .notNull(),
        assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    },
    (table) => [uniqueIndex("uq_referee_race_idx").on(table.raceId)],
);
