import {
    pgTable,
    varchar,
    timestamp,
    uuid,
    pgEnum,
    integer,
} from "drizzle-orm/pg-core";
import { tournaments } from "./tournament.js";

export const roundEnums = pgEnum("round", ["qualifier", "semifinal", "final"]);
export const trackConditionsEnums = pgEnum("track_condition", [
    "dry",
    "wet",
    "muddy",
]);
export const raceStatusEnums = pgEnum("race_status", [
    "scheduled",
    "pre_race",
    "ongoing",
    "completed",
    "cancelled",
]);

export const races = pgTable("races", {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id").references(() => tournaments.id),
    name: varchar("name", { length: 255 }).notNull(),
    raceNumber: integer("race_number").notNull(),
    round: roundEnums("round").notNull(),
    distanceMeters: integer("distance_meters").notNull(),
    trackCondition: trackConditionsEnums("track_condition").notNull(),
    scheduleAt: timestamp("schedule_at").notNull(),
    venue: varchar("venue", { length: 255 }).notNull(),
    laneCount: integer("lane_count").notNull(),
    status: raceStatusEnums("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
