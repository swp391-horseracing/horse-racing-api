import { NextFunction, Request, Response } from "express";
import { eq, count, sql } from "drizzle-orm";
import db from "../config/db.js";
import { shopItems } from "../schema/shopItems.js";
import { userInventory } from "../schema/userInventory.js";
import { wallets } from "../schema/wallets.js";
import { walletTransactions } from "../schema/walletTransaction.js";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import { listShopItemsQuerySchema } from "../validator/shop.js";

export const listShopItems = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const parsed = listShopItemsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }
        const { page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const totalResult = await db
            .select({ count: count() })
            .from(shopItems)
            .where(eq(shopItems.isActive, true));

        const items = await db
            .select({
                id: shopItems.id,
                name: shopItems.name,
                description: shopItems.description,
                price: shopItems.price,
                imageUrl: shopItems.imageUrl,
                createdAt: shopItems.createdAt,
            })
            .from(shopItems)
            .where(eq(shopItems.isActive, true))
            .orderBy(shopItems.createdAt)
            .limit(l)
            .offset(offset);

        res.json(
            paginatedResponse(items, Number(totalResult[0]?.count ?? 0), p, l),
        );
    } catch (err) {
        next(err);
    }
};

export const getShopItem = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const itemId = req.params.itemId as string;

        const [item] = await db
            .select()
            .from(shopItems)
            .where(eq(shopItems.id, itemId));

        if (!item || !item.isActive) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.json(item);
    } catch (err) {
        next(err);
    }
};

export const purchaseItem = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { itemId } = req.body;
        const userId = req.user!.id;

        const result = await db.transaction(async (tx) => {
            const [item] = await tx
                .select()
                .from(shopItems)
                .where(eq(shopItems.id, itemId))
                .for("update");

            if (!item || !item.isActive) {
                throw new Error("Item not found");
            }

            const [wallet] = await tx
                .select()
                .from(wallets)
                .where(eq(wallets.userId, userId))
                .for("update");

            if (!wallet) {
                throw new Error("Wallet not found");
            }

            if (wallet.balance < item.price) {
                throw new Error("Insufficient funds");
            }

            const newBalance = wallet.balance - item.price;

            await tx
                .update(wallets)
                .set({ balance: newBalance, updatedAt: sql`now()` })
                .where(eq(wallets.id, wallet.id));

            await tx.insert(walletTransactions).values({
                walletId: wallet.id,
                type: "purchase",
                status: "completed",
                amount: -item.price,
                balanceBefore: wallet.balance,
                balanceAfter: newBalance,
                referenceId: item.id,
                description: `Purchased: ${item.name}`,
            });

            const [inventory] = await tx
                .insert(userInventory)
                .values({ userId, itemId: item.id })
                .returning();

            return {
                inventory: inventory!,
                balance: newBalance,
                item: {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    imageUrl: item.imageUrl,
                },
            };
        });

        res.status(201).json({
            item: result.item,
            balance: result.balance,
            purchasedAt: result.inventory.purchasedAt,
        });
    } catch (err) {
        if (err instanceof Error) {
            if (err.message === "Insufficient funds") {
                return res.status(402).json({ message: "Insufficient funds" });
            }
            if (err.message === "Wallet not found") {
                return res.status(404).json({ message: "Wallet not found" });
            }
            if (err.message === "Item not found") {
                return res.status(404).json({ message: "Item not found" });
            }
        }
        next(err);
    }
};

export const getInventory = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.id;

        const parsed = listShopItemsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }
        const { page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const [totalResult] = await db
            .select({ count: count() })
            .from(userInventory)
            .innerJoin(shopItems, eq(userInventory.itemId, shopItems.id))
            .where(eq(userInventory.userId, userId));

        const items = await db
            .select({
                id: userInventory.id,
                itemId: userInventory.itemId,
                name: shopItems.name,
                description: shopItems.description,
                price: shopItems.price,
                imageUrl: shopItems.imageUrl,
                purchasedAt: userInventory.purchasedAt,
            })
            .from(userInventory)
            .innerJoin(shopItems, eq(userInventory.itemId, shopItems.id))
            .where(eq(userInventory.userId, userId))
            .orderBy(userInventory.purchasedAt)
            .limit(l)
            .offset(offset);

        res.json(
            paginatedResponse(items, Number(totalResult?.count ?? 0), p, l),
        );
    } catch (err) {
        next(err);
    }
};
