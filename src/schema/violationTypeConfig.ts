import {
    pgTable,
    varchar,
    text,
    timestamp,
    uuid,
    integer,
} from "drizzle-orm/pg-core";

export const violationTypeConfig = pgTable("violation_type_config", {
    id: uuid("id").defaultRandom().primaryKey(),
    violationType: varchar("violation_type", { length: 100 })
        .unique()
        .notNull(),
    pointsDeducted: integer("points_deducted").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
