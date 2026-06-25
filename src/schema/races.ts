import {
    pgTable,
    varchar,
    timestamp,
    uuid,
    pgEnum,
    integer,
} from "drizzle-orm/pg-core";
import { tournaments } from "./tournament.js";
import { courseDistances } from "./courseDistances.js";

export const raceStatusEnums = pgEnum("race_status", [
    "draft",
    "scheduled",
    "pre_race",
    "ongoing",
    "under_review",
    "result_confirmed",
    "completed",
    "postponed",
    "cancelled",
]);

export const races = pgTable("races", {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id")
        .references(() => tournaments.id)
        .notNull(),
    courseDistanceId: uuid("course_distance_id")
        .references(() => courseDistances.id)
        .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    raceNumber: integer("race_number"),
    scheduleAt: timestamp("schedule_at"),
    laneCount: integer("lane_count"),
    status: raceStatusEnums("status").default("draft").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
