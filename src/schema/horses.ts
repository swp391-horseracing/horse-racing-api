import {
    pgTable,
    pgEnum,
    uuid,
    varchar,
    date,
    numeric,
    boolean,
    timestamp,
    real,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const horseSexEnum = pgEnum("horse_sex", ["male", "female", "gelding"]);

export const horseHealthStatusEnum = pgEnum("horse_health_status", [
    "healthy",
    "injured",
    "sick",
    "rest",
]);

export const horses = pgTable("horses", {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").references(() => users.id),
    name: varchar("name", { length: 255 }).notNull().unique(),
    breed: varchar("breed", { length: 255 }).notNull(),
    birthDate: date("birth_date"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    imageUrl: varchar("image_url", { length: 255 }),
    healthStatus: horseHealthStatusEnum("health_status"),
    sex: horseSexEnum("sex"),
    isRetired: boolean("isRetired"),
    baseSpeed: real("base_speed").default(0).notNull(),
    stamina: real("stamina").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
