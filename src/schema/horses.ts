import {
    pgTable,
    uuid,
    varchar,
    date,
    numeric,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const horses = pgTable("horses", {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("id").references(() => users.id),
    name: varchar("name", { length: 255 }).notNull().unique(),
    breed: varchar("breed", { length: 255 }).notNull(),
    birthDate: date("birth_date"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    imageUrl: varchar("image_url", { length: 255 }),
    healthStatus: varchar("health_status", { length: 255 }),
    isRetired: boolean("isRetired"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
