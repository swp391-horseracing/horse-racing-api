import {
    pgTable,
    text,
    timestamp,
    uuid,
    pgEnum,
    integer,
} from "drizzle-orm/pg-core";
import { wallets } from "./wallets.js";

export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", [
    "genesis",
    "prediction",
    "reward",
    "refund",
    "admin_adjustment",
]);

export const walletTransactionStatusEnum = pgEnum("wallet_transaction_status", [
    "pending",
    "completed",
    "failed",
    "cancelled",
]);

export const walletTransactions = pgTable("wallet_transactions", {
    id: uuid("id").defaultRandom().primaryKey(),

    walletId: uuid("wallet_id")
        .notNull()
        .references(() => wallets.id, {
            onDelete: "cascade",
        }),

    type: walletTransactionTypeEnum("type").notNull(),

    status: walletTransactionStatusEnum("status").notNull().default("pending"),

    amount: integer("amount").notNull(),

    balanceBefore: integer("balance_before").notNull(),

    balanceAfter: integer("balance_after").notNull(),

    referenceId: uuid("reference_id"),

    description: text("description"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});
