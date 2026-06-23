import {
    pgTable,
    timestamp,
    boolean,
    decimal,
    foreignKey,
    unique,
    check,
    uuid,
    integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { races } from "./races.js";
import { raceEntries } from "./raceEntries.js";

export const predictions = pgTable(
    "predictions",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        spectatorId: uuid("spectator_id")
            .notNull()
            .references(() => users.id),
        raceId: uuid("race_id")
            .notNull()
            .references(() => races.id),
        predictedEntryId: uuid("predicted_entry_id").notNull(),
        predictedPosition: integer("predicted_position").notNull(),
        placedAt: timestamp("placed_at").defaultNow().notNull(),
        isCorrect: boolean("is_correct"),
        rewardAmount: decimal("reward_amount", { precision: 15, scale: 2 }),
    },
    (table) => [
        foreignKey({
            columns: [table.predictedEntryId, table.raceId],
            foreignColumns: [raceEntries.id, raceEntries.raceId],
        }),

        unique("uq_spectator_race").on(table.spectatorId, table.raceId),

        check(
            "chk_predicted_position",
            sql`${table.predictedPosition} BETWEEN 1 AND 3`,
        ),
    ],
);
