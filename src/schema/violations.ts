import {
    pgTable,
    text,
    timestamp,
    uuid,
    pgEnum,
    integer,
} from "drizzle-orm/pg-core";
import { raceEntries } from "./raceEntries.js";
import { users } from "./users.js";
import { violationTypeConfig } from "./violationTypeConfig.js";
import { finishStatusEnum } from "./raceResultEntries.js";

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
    violationTypeConfigId: uuid("violation_type_config_id")
        .references(() => violationTypeConfig.id)
        .notNull(),
    severity: violationSeverityEnum("severity").notNull(),
    note: text("note"),
    pointsDeducted: integer("points_deducted"),
    previousFinishStatus: finishStatusEnum("previous_finish_status"),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
