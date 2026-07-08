import {
    pgTable,
    uuid,
    varchar,
    date,
    integer,
    numeric,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const horses = pgTable("horses", {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").references(() => users.id),
    name: varchar("name", { length: 255 }).notNull().unique(),
    breed: varchar("breed", { length: 255 }).notNull(),
    birthDate: date("birth_date"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    imageUrl: varchar("image_url", { length: 255 }),
    healthStatus: varchar("health_status", { length: 255 }),
    isRetired: boolean("isRetired"),
    baseSpeed: integer("base_speed").default(0).notNull(),
    stamina: integer("stamina").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
