import {
    pgTable,
    uuid,
    pgEnum,
    integer,
    decimal,
    unique,
    timestamp,
} from "drizzle-orm/pg-core";
import { raceResults } from "./raceResults.js";
import { raceEntries } from "./raceEntries.js";
import { violations } from "./violations.js";

export const finishStatusEnum = pgEnum("finish_status", [
    "finished",
    "dnf",
    "dsq",
    "dns",
]);

export const raceResultEntries = pgTable(
    "race_result_entries",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        resultId: uuid("result_id")
            .references(() => raceResults.id)
            .notNull(),
        entryId: uuid("entry_id")
            .references(() => raceEntries.id)
            .notNull(),
        finishedPosition: integer("finished_position"),
        finishTime: decimal("finish_time", { precision: 8, scale: 3 }),
        finishStatus: finishStatusEnum("finish_status")
            .default("finished")
            .notNull(),
        points: integer().notNull().default(0),
        violationId: uuid("violation_id").references(() => violations.id),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        unique().on(table.resultId, table.entryId),
        unique().on(table.resultId, table.finishedPosition),
    ],
);
