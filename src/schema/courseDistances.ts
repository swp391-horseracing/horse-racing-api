import { pgTable, integer, uuid, unique } from "drizzle-orm/pg-core";
import { raceCourses } from "./raceCourses.js";

export const courseDistances = pgTable(
    "course_distances",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        courseId: uuid("course_id")
            .references(() => raceCourses.id, { onDelete: "cascade" })
            .notNull(),
        distanceMeters: integer("distance_meters").notNull(),
    },
    (table) => [
        unique("uq_course_distance").on(table.courseId, table.distanceMeters),
    ],
);
