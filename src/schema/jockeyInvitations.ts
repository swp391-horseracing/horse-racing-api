import { pgTable, uuid, pgEnum, timestamp, text } from "drizzle-orm/pg-core";
import { races } from "./races.js";
import { horses } from "./horses.js";
import { users } from "./users.js";

export const invitationStatusEnums = pgEnum("invitation_status", [
    "pending",
    "accepted",
    "declined",
    "cancelled",
]);

export const jockeyInvitations = pgTable("jockey_invitations", {
    invitationId: uuid("invitation_id").defaultRandom().primaryKey(),
    raceId: uuid("race_id")
        .references(() => races.id)
        .notNull(),
    horseId: uuid("horse_id")
        .references(() => horses.id)
        .notNull(),
    ownerId: uuid("owner_id")
        .references(() => users.id)
        .notNull(),
    jockeyId: uuid("jockey_id")
        .references(() => users.id)
        .notNull(),
    status: invitationStatusEnums("status").default("pending").notNull(),
    message: text("message"),
    invitedAt: timestamp("invited_at").defaultNow().notNull(),
    respondedAt: timestamp("responded_at"),
});
