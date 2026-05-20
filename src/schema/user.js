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

export const statusEnums = pgEnum("statis", ["pending", "active", "locked"]);

export const users = pgTable("users", {
    id: uuid("id").primaryKey(),
    full_name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: text("password").notNull(),
    phone: varchar("phone", { length: 15 }).notNull(),
    address: varchar("address", { length: 225 }),
    avatar_url: text("avatar_url"),
    role: rolesEnum(),
    status: statusEnums(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
});
