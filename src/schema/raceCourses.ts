import {
    pgTable,
    timestamp,
    uuid,
    integer,
    varchar,
    text,
    pgEnum,
} from "drizzle-orm/pg-core";
import { trackShapes } from "./trackShapes.js";

export const raceSurfacesEnums = pgEnum("race_surfaces", [
    "turf",
    "dirt",
    "synthetic",
]);

export const courseStatusEnum = pgEnum("course_status", [
    "active",
    "inactive",
    "under_maintainance",
]);

export const raceCourses = pgTable("race_courses", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    country: varchar("country", { length: 100 }).notNull().default("Vietnam"),
    city: varchar("city", { length: 150 }).notNull(),
    address: text("address"),
    surfaceType: raceSurfacesEnums("surface_type").notNull(),
    trackShapeId: uuid("track_shape_id")
        .references(() => trackShapes.id)
        .notNull(),
    distanceMeters: integer("distance_meters").notNull(),
    maxStartingPositions: integer("max_starting_positions").notNull(),
    grandstandCapacity: integer("grandstand_capacity").notNull(),

    status: courseStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
