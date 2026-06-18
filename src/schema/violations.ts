import {
    pgTable,
    varchar,
    text,
    timestamp,
    uuid,
    pgEnum,
} from "drizzle-orm/pg-core";
import { races } from "./races.js";
import { raceEntries } from "./raceEntries.js";
import { users } from "./users.js";

export const violationSeverityEnum = pgEnum("violation_severity", [
    "warning",
    "disqualification",
    "result_cancellation",
    "point_deduction",
]);

export const violations = pgTable("violations", {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
        .references(() => raceEntries.id)
        .notNull(),
    refereeId: uuid("referee_id")
        .references(() => users.id)
        .notNull(),
    occurredAt: timestamp("occurred_at").notNull(),
    violationType: varchar("violation_type", { length: 100 }).notNull(),
    description: text("description").notNull(),
    severity: violationSeverityEnum("severity").notNull(),
    note: text("note"),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
