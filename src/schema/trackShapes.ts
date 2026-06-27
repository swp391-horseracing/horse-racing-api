import { pgTable, varchar, timestamp, uuid, text } from "drizzle-orm/pg-core";

export const trackShapes = pgTable("track_shapes", {
    id: uuid("id").defaultRandom().primaryKey(),
    shape: varchar("shape", { length: 100 }).notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
