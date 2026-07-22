import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, sql } from "drizzle-orm";
import config from "../config/config.js";
import db from "../config/db.js";
import { users } from "../schema/users.js";
import { wallets } from "../schema/wallets.js";
import { walletTransactions } from "../schema/walletTransaction.js";
import { notifications } from "../schema/notifications.js";
import { eventBus } from "../websocket/eventBus.js";
import { NextFunction, Request, Response } from "express";

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { fullName, email, password, role } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const [user] = await db
            .insert(users)
            .values({ fullName, email, password: hashPassword, role })
            .returning({ id: users.id });

        if (!user) {
            return res
                .status(500)
                .json({ message: "Failed to create account" });
        }

        const [wallet] = await db
            .insert(wallets)
            .values({ userId: user.id, balance: 10000 })
            .returning();

        if (wallet) {
            await db.insert(walletTransactions).values({
                walletId: wallet.id,
                type: "genesis",
                status: "completed",
                amount: wallet.balance,
                balanceBefore: 0,
                balanceAfter: wallet.balance,
                description: "Welcome bonus",
            });
        }

        res.status(201).json({ message: "Account created", user });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err.cause.code == "23505") {
            return res.status(409).json({ message: "Email already in use" });
        }
        next(err);
    }
};

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { email, password } = req.body;

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (user.status === "locked") {
            return res.status(403).json({ message: "Account is locked" });
        }

        const today = new Date().toISOString().split("T")[0];
        const lastDate =
            user.lastLoginDate?.toISOString().split("T")[0] ?? null;
        let rewardGranted = false;
        let pointsAwarded = 0;

        if (lastDate !== today) {
            pointsAwarded = Number(config().DAILY_REWARD_POINTS ?? 10);

            await db.transaction(async (tx) => {
                await tx
                    .update(users)
                    .set({ lastLoginDate: new Date() })
                    .where(eq(users.id, user.id));

                const [wallet] = await tx
                    .select({ id: wallets.id, balance: wallets.balance })
                    .from(wallets)
                    .where(eq(wallets.userId, user.id))
                    .for("update");

                if (wallet) {
                    await tx
                        .update(wallets)
                        .set({
                            balance: sql`${wallets.balance} + ${pointsAwarded}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(wallets.id, wallet.id));

                    await tx.insert(walletTransactions).values({
                        walletId: wallet.id,
                        type: "reward",
                        status: "completed",
                        amount: pointsAwarded,
                        balanceBefore: wallet.balance,
                        balanceAfter: wallet.balance + pointsAwarded,
                        description: "Daily login reward",
                    });
                }
            });

            const [notification] = await db
                .insert(notifications)
                .values({
                    userId: user.id,
                    title: "Daily Reward",
                    body: `You earned ${pointsAwarded} points for logging in today!`,
                    type: "price",
                    referenceId: user.id,
                    referenceType: "reward",
                })
                .returning({ id: notifications.id });

            if (notification) {
                eventBus.emit({
                    type: "notification:created",
                    data: {
                        userId: user.id,
                        notificationId: notification.id,
                        title: "Daily Reward",
                        body: `You earned ${pointsAwarded} points for logging in today!`,
                        type: "price",
                    },
                });
            }

            rewardGranted = true;
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                tokenVersion: user.token_version,
            },
            config().JWT_SECRET,
            { expiresIn: config().JWT_EXPIRES_IN } as jwt.SignOptions,
        );

        const [wallet] = await db
            .select({ balance: wallets.balance })
            .from(wallets)
            .where(eq(wallets.userId, user.id));

        res.json({
            token,
            user: {
                id: user.id,
                full_name: user.fullName,
                email: user.email,
                role: user.role,
                status: user.status,
                balance: wallet?.balance ?? 0,
                dailyReward: {
                    granted: rewardGranted,
                    points: pointsAwarded,
                },
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        next(err);
    }
};

export const logout = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        await db
            .update(users)
            .set({ token_version: sql`${users.token_version} + 1` })
            .where(eq(users.id, req.user!.id));

        res.json({ message: "Logged out successfully" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        next(err);
    }
};
