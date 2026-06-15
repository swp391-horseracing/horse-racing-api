import {
    pgTable,
    varchar,
    text,
    timestamp,
    uuid,
    pgEnum,
    check,
    integer,
    numeric,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { sql } from "drizzle-orm";

export const tournamentStatusEnums = pgEnum("tournament_status", [
    "draft",
    "upcoming",
    "registration_open",
    "registration_closed",
    "ongoing",
    "completed",
    "cancelled",
]);

export const tournaments = pgTable(
    "tournaments",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        name: varchar("name", { length: 255 }).notNull(),
        description: text("description"),
        rules: text("rules"),
        location: varchar("location", { length: 100 }),
        startDate: timestamp("start_date").notNull(),
        endDate: timestamp("end_date").notNull(),
        registrationOpenDate: timestamp("registration_open_date"),
        registrationCloseDate: timestamp("registration_close_date"),
        maximumParticipants: integer("maximum_participants"),
        minimumParticipants: integer("minimum_participants"),
        prizePool: numeric("prize_pool", { precision: 12, scale: 2 }),
        status: tournamentStatusEnums().default("draft").notNull(),
        createdBy: uuid("created_by")
            .references(() => users.id)
            .notNull(),
        createdAt: timestamp().defaultNow(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        check(
            "open_close_date_check",
            sql`${table.registrationOpenDate} < ${table.registrationCloseDate}`,
        ),
        check(
            "start_end_date_check",
            sql`${table.startDate} < ${table.endDate}`,
        ),
        check(
            "max_min_part_check",
            sql`${table.maximumParticipants} >= ${table.minimumParticipants}`,
        ),
    ],
);
