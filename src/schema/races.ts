import {
    pgTable,
    varchar,
    timestamp,
    uuid,
    pgEnum,
    integer,
} from "drizzle-orm/pg-core";
import { tournaments } from "./tournament.js";

export const trackConditionsEnums = pgEnum("track_condition", [
    "dry",
    "wet",
    "muddy",
]);
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
    name: varchar("name", { length: 255 }).notNull(),
    raceNumber: integer("race_number"),
    roundNumber: integer("round_number"),
    roundName: varchar("round", { length: 100 }),
    distanceMeters: integer("distance_meters"),
    trackCondition: trackConditionsEnums("track_condition"),
    scheduleAt: timestamp("schedule_at"),
    venue: varchar("venue", { length: 255 }),
    laneCount: integer("lane_count"),
    status: raceStatusEnums("status").default("draft").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
