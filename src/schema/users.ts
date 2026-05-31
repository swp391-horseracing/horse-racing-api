import {
    pgTable,
    varchar,
    text,
    timestamp,
    uuid,
    pgEnum,
} from "drizzle-orm/pg-core";

export const rolesEnum = pgEnum("roles", [
    "horse_owner",
    "jockey",
    "referee",
    "spectator",
    "admin",
]);

export const statusEnums = pgEnum("status", ["pending", "active", "locked"]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: text("password").notNull(),
    phone: varchar("phone", { length: 15 }),
    address: varchar("address", { length: 225 }),
    avatar_url: text("avatar_url"),
    role: rolesEnum().notNull(),
    status: statusEnums().default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
});
