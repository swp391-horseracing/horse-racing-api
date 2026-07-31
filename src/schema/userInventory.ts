import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { shopItems } from "./shopItems.js";

export const userInventory = pgTable("user_inventory", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
        .notNull()
        .references(() => shopItems.id, { onDelete: "restrict" }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
