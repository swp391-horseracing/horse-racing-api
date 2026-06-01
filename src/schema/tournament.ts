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
    "upcoming",
    "registration_open",
    "ongoing",
    "completed",
    "cancelled",
]);

export const tournaments = pgTable("tournaments", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    rules: text("rules").notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    registrationDeadline: timestamp("registration_deadline").notNull(),
    status: tournamentStatusEnums(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
