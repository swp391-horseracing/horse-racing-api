import {
    pgTable,
    varchar,
    text,
    timestamp,
    uuid,
    boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const notifications = pgTable("notifications", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    type: varchar("type", { length: 50 }).notNull(), // race_result, jockey_invite, price
    referenceId: varchar("reference_id", { length: 50 }).notNull(),
    referenceType: varchar("reference_type", { length: 50 }).notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});
