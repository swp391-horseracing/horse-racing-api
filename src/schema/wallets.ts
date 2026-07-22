import { check, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const wallets = pgTable(
    "wallets",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        userId: uuid("user_id")
            .notNull()
            .unique()
            .references(() => users.id, {
                onDelete: "restrict",
            }),

        balance: integer("balance").notNull().default(1000),

        createdAt: timestamp("created_at").defaultNow().notNull(),

        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => [
        check("chk_wallets_balance_non_negative", sql`${table.balance} >= 0`),
    ],
);
