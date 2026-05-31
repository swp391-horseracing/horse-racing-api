import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { races } from "./races";
import { users } from "./users";

export const refereeAssignments = pgTable("referee_assignments", {
    id: uuid("id").defaultRandom().primaryKey(),
    raceId: uuid("race_id")
        .references(() => races.id)
        .notNull()
        .unique(),
    refereeId: uuid("referee_id")
        .references(() => users.id)
        .notNull()
        .unique(),
    assignedBy: uuid("assigned_by")
        .references(() => users.id)
        .notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});
