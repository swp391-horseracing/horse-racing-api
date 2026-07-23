import { and, eq, isNull, sql } from "drizzle-orm";
import db from "../config/db.js";
import { races } from "../schema/races.js";
import { predictions } from "../schema/predictions.js";
import { wallets } from "../schema/wallets.js";
import { walletTransactions } from "../schema/walletTransaction.js";
import { eventBus } from "../websocket/eventBus.js";
import { PRE_RACE_WINDOW_MINUTES } from "./constants.js";
import { precomputeRaceFromDb } from "./precompute.js";
import { tickEmitter } from "../race/tickEmitter.js";

export async function transitionRaces(): Promise<void> {
    await transitionScheduledToPreRace();
    await transitionPreRaceToOngoing();
    await refundCancelledPredictions();
}

export async function refundCancelledPredictions(): Promise<void> {
    console.log(
        "[cron:refund] Checking cancelled/postponed races for pending predictions",
    );

    const cancelledRaces = await db
        .select({ id: races.id })
        .from(races)
        .where(and(sql`${races.status} IN ('cancelled', 'postponed')`));

    for (const race of cancelledRaces) {
        await db.transaction(async (tx) => {
            const pendingPredictions = await tx
                .select({
                    id: predictions.id,
                    spectatorId: predictions.spectatorId,
                    stakeAmount: predictions.stakeAmount,
                })
                .from(predictions)
                .where(
                    and(
                        eq(predictions.raceId, race.id),
                        isNull(predictions.isCorrect),
                    ),
                )
                .for("update", { skipLocked: true });

            if (pendingPredictions.length === 0) return;

            console.log(
                `[cron:refund] Race ${race.id} — refunding ${pendingPredictions.length} predictions`,
            );

            for (const p of pendingPredictions) {
                const [wallet] = await tx
                    .select({ id: wallets.id, balance: wallets.balance })
                    .from(wallets)
                    .where(eq(wallets.userId, p.spectatorId))
                    .for("update");

                if (wallet) {
                    const refundAmount = p.stakeAmount ?? 0;

                    if (refundAmount <= 0) continue;

                    await tx
                        .update(wallets)
                        .set({
                            balance: sql`${wallets.balance} + ${refundAmount}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(wallets.id, wallet.id));

                    await tx.insert(walletTransactions).values({
                        walletId: wallet.id,
                        type: "refund",
                        status: "completed",
                        amount: refundAmount,
                        balanceBefore: wallet.balance,
                        balanceAfter: wallet.balance + refundAmount,
                        referenceId: race.id,
                        description: "Refund for cancelled/postponed race",
                    });
                }

                await tx
                    .update(predictions)
                    .set({ isCorrect: false })
                    .where(
                        and(
                            eq(predictions.id, p.id),
                            isNull(predictions.isCorrect),
                        ),
                    );
            }
        });
    }
}

async function transitionScheduledToPreRace(): Promise<void> {
    console.log("[cron:race] Checking scheduled → pre_race");

    const updatedRaces = await db
        .update(races)
        .set({ status: "pre_race" })
        .where(
            and(
                eq(races.status, "scheduled"),
                sql`${races.scheduleAt} <= NOW() + ${PRE_RACE_WINDOW_MINUTES} * INTERVAL '1 minute'`,
            ),
        )
        .returning();

    for (const race of updatedRaces) {
        console.log(`[cron:race] Transitioned ${race.id} scheduled → pre_race`);
        emitRaceEvent(race.id, "pre_race", "scheduled");

        try {
            await precomputeRaceFromDb(race.id);
            console.log(`[cron:race] Precomputed simulation for ${race.id}`);
        } catch (err) {
            console.error(`[cron:race] Failed to precompute ${race.id}:`, err);
        }
    }
}

export async function transitionPreRaceToOngoing(): Promise<void> {
    console.log("[cron:race] Checking pre_race → ongoing");
    const updatedRaces = await db
        .update(races)
        .set({ status: "ongoing" })
        .where(
            and(
                eq(races.status, "pre_race"),
                sql`${races.scheduleAt} <= NOW()`,
            ),
        )
        .returning();

    for (const race of updatedRaces) {
        console.log(`[cron:race] Transitioned ${race.id} pre_race → ongoing`);
        emitRaceEvent(race.id, "ongoing", "pre_race");
        try {
            await tickEmitter.startRace(race.id);
        } catch (err) {
            console.error(
                `[cron:race] Failed to start race ${race.id}: ${err}`,
            );
        }
    }
}

function emitRaceEvent(
    raceId: string,
    status: string,
    previousStatus: string,
): void {
    try {
        eventBus.emit({
            type: "race:status_changed",
            data: {
                raceId,
                status,
                previousStatus,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (err) {
        console.error(`Failed to emit race:status_changed: ${err}`);
    }
}
