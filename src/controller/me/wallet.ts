import { NextFunction, Request, Response } from "express";
import { eq, desc } from "drizzle-orm";
import db from "../../config/db.js";
import { wallets } from "../../schema/wallets.js";
import { walletTransactions } from "../../schema/walletTransaction.js";

export async function ensureWallet(userId: string): Promise<{ id: string; balance: number }> {
    const [existing] = await db
        .select({ id: wallets.id, balance: wallets.balance })
        .from(wallets)
        .where(eq(wallets.userId, userId));

    if (existing) return existing;

    const result = await db.transaction(async (tx) => {
        const [wallet] = await tx
            .insert(wallets)
            .values({ userId, balance: 0 })
            .returning();

        await tx.insert(walletTransactions).values({
            walletId: wallet!.id,
            type: "genesis",
            status: "completed",
            amount: 0,
            balanceBefore: 0,
            balanceAfter: 0,
            description: "Wallet created",
        });

        return { id: wallet!.id, balance: wallet!.balance };
    });

    return result!;
}

export const getMyWallet = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;

        const wallet = await ensureWallet(user.id);

        const transactions = await db
            .select({
                id: walletTransactions.id,
                type: walletTransactions.type,
                status: walletTransactions.status,
                amount: walletTransactions.amount,
                balanceBefore: walletTransactions.balanceBefore,
                balanceAfter: walletTransactions.balanceAfter,
                description: walletTransactions.description,
                createdAt: walletTransactions.createdAt,
            })
            .from(walletTransactions)
            .where(eq(walletTransactions.walletId, wallet.id))
            .orderBy(desc(walletTransactions.createdAt))
            .limit(50);

        res.json({
            walletId: wallet.id,
            balance: wallet.balance,
            transactions,
        });
    } catch (err) {
        next(err);
    }
};
