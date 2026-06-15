import {
    pgTable,
    uuid,
    pgEnum,
    timestamp,
    varchar,
    unique,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tournaments } from "./tournament.js";
import { horses } from "./horses.js";
import { users } from "./users.js";

export const registrationStatusEnums = pgEnum("registration_status", [
    "pending",
    "approved",
    "rejected",
]);

export const tournamentRegistrations = pgTable(
    "tournament_registrations",
    {
        registrationId: uuid("registration_id").defaultRandom().primaryKey(),
        tournamentId: uuid("tournament_id")
            .references(() => tournaments.id)
            .notNull(),
        horseId: uuid("horse_id")
            .references(() => horses.id)
            .notNull(),
        ownerId: uuid("owner_id")
            .references(() => users.id)
            .notNull(),
        status: registrationStatusEnums("status").default("pending").notNull(),
        submittedAt: timestamp("submitted_at").defaultNow().notNull(),
        reviewedBy: uuid("reviewed_by").references(() => users.id),
        reviewedAt: timestamp("reviewed_at"),
        rejectReason: varchar("reject_reason", { length: 500 }),
    },
    (table) => [
        unique().on(table.tournamentId, table.horseId),
        check(
            "tournament_registrations_review_state_ck",
            sql`(${table.status} = 'pending' AND ${table.reviewedBy} IS NULL AND ${table.reviewedAt} IS NULL AND ${table.rejectReason} IS NULL) OR (${table.status} = 'approved' AND ${table.reviewedBy} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL AND ${table.rejectReason} IS NULL) OR (${table.status} = 'rejected' AND ${table.reviewedBy} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL AND ${table.rejectReason} IS NOT NULL)`,
        ),
    ],
);
