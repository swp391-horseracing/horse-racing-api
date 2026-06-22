import {
    pgTable,
    uuid,
    pgEnum,
    integer,
    decimal,
    unique,
    timestamp,
    foreignKey,
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
        raceId: uuid("race_id").notNull(),
        resultId: uuid("result_id").notNull(),
        entryId: uuid("entry_id").notNull(),
        finishedPosition: integer("finished_position"),
        finishTime: decimal("finish_time", { precision: 8, scale: 3 }),
        finishStatus: finishStatusEnum("finish_status")
            .default("finished")
            .notNull(),
        points: integer().notNull().default(0),
        previousFinishStatus: finishStatusEnum("previous_finish_status"),
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
        foreignKey({
            columns: [table.entryId, table.raceId],
            foreignColumns: [raceEntries.id, raceEntries.raceId],
            name: "race_result_entries_entry_race_fk",
        }),
        foreignKey({
            columns: [table.resultId, table.raceId],
            foreignColumns: [raceResults.id, raceResults.raceId],
            name: "race_result_entries_result_race_fk",
        }),
    ],
);
