import {
    pgTable,
    varchar,
    text,
    timestamp,
    uuid,
    pgEnum,
    date,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const tournamentStatusEnums = pgEnum("tournament_status", [
    "draft",
    "upcoming",
    "registration_open",
    "registration_closed",
    "ongoing",
    "completed",
    "cancelled",
]);

export const tournaments = pgTable("tournaments", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    rules: text("rules"),
    location: varchar("location", { length: 100 }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    registrationOpenDate: timestamp("registration_open_date"),
    registrationCloseDate: timestamp("registration_close_date"),
    status: tournamentStatusEnums().default("draft").notNull(),
    createdBy: uuid("created_by")
        .references(() => users.id)
        .notNull(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
