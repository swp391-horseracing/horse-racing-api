import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { predictions } from "../schema/predictions.js";
import { wallets } from "../schema/wallets.js";
import { walletTransactions } from "../schema/walletTransaction.js";
import { notifications } from "../schema/notifications.js";
import { eventBus } from "../websocket/eventBus.js";

const POSITION_WEIGHTS: Record<number, number> = { 1: 3, 2: 2, 3: 1 };

export async function resolvePredictions(
    raceId: string,
    resultId: string,
    tx: PgTransaction<
        NodePgQueryResultHKT,
        Record<string, never>,
        ExtractTablesWithRelations<Record<string, never>>
    >,
): Promise<void> {
    const results = await tx
        .select({
            entryId: raceResultEntries.entryId,
            position: raceResultEntries.finishedPosition,
        })
        .from(raceResultEntries)
        .where(
            and(
                eq(raceResultEntries.raceId, raceId),
                isNotNull(raceResultEntries.finishedPosition),
            ),
        );

    const resultMap = new Map(results.map((r) => [r.entryId, r.position]));

    const pendingPredictions = await tx
        .select({
            id: predictions.id,
            spectatorId: predictions.spectatorId,
            predictedEntryId: predictions.predictedEntryId,
            predictedPosition: predictions.predictedPosition,
            stakeAmount: predictions.stakeAmount,
        })
        .from(predictions)
        .where(
            and(eq(predictions.raceId, raceId), isNull(predictions.isCorrect)),
        );

    const correctList: {
        id: string;
        spectatorId: string;
        stakeAmount: number;
        predictedPosition: number;
    }[] = [];
    const incorrectIds: string[] = [];
    let totalPool = 0;
    let totalWeightedCorrectStake = 0;

    for (const p of pendingPredictions) {
        totalPool += p.stakeAmount ?? 0;
        const actualPosition = resultMap.get(p.predictedEntryId);
        if (actualPosition === p.predictedPosition) {
            const stake = p.stakeAmount ?? 0;
            const weight = POSITION_WEIGHTS[p.predictedPosition] ?? 1;
            correctList.push({
                id: p.id,
                spectatorId: p.spectatorId,
                stakeAmount: stake,
                predictedPosition: p.predictedPosition,
            });
            totalWeightedCorrectStake += stake * weight;
        } else {
            incorrectIds.push(p.id);
        }
    }

    if (incorrectIds.length > 0) {
        await tx
            .update(predictions)
            .set({ isCorrect: false })
            .where(inArray(predictions.id, incorrectIds));
    }

    if (correctList.length > 0 && totalPool > 0) {
        let distributed = 0;
        const rewards: {
            predictionId: string;
            spectatorId: string;
            rewardAmount: number;
        }[] = [];

        for (let i = 0; i < correctList.length; i++) {
            const p = correctList[i]!;
            let share: number;
            if (i === correctList.length - 1) {
                share = totalPool - distributed;
            } else {
                const weight = POSITION_WEIGHTS[p.predictedPosition] ?? 1;
                const weightedStake = p.stakeAmount * weight;
                share = Math.floor(
                    (totalPool * weightedStake) / totalWeightedCorrectStake,
                );
                distributed += share;
            }
            rewards.push({
                predictionId: p.id,
                spectatorId: p.spectatorId,
                rewardAmount: share,
            });
        }

        for (const r of rewards) {
            await tx
                .update(predictions)
                .set({
                    isCorrect: true,
                    rewardAmount: `${r.rewardAmount}.00`,
                })
                .where(eq(predictions.id, r.predictionId));
            const [wallet] = await tx
                .select({ id: wallets.id, balance: wallets.balance })
                .from(wallets)
                .where(eq(wallets.userId, r.spectatorId))
                .for("update");

            if (wallet) {
                await tx
                    .update(wallets)
                    .set({
                        balance: sql`${wallets.balance} + ${r.rewardAmount}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(wallets.id, wallet.id));

                await tx.insert(walletTransactions).values({
                    walletId: wallet.id,
                    type: "reward",
                    status: "completed",
                    amount: r.rewardAmount,
                    balanceBefore: wallet.balance,
                    balanceAfter: wallet.balance + r.rewardAmount,
                    referenceId: raceId,
                    description: "Prize from prediction pool",
                });
            }

            const [notification] = await tx
                .insert(notifications)
                .values({
                    userId: r.spectatorId,
                    title: "Prediction Result",
                    body: `Your prediction was correct! You won ${r.rewardAmount} points from the pool.`,
                    type: "race_result",
                    referenceId: raceId,
                    referenceType: "prediction",
                })
                .returning({ id: notifications.id });

            if (notification) {
                eventBus.emit({
                    type: "notification:created",
                    data: {
                        userId: r.spectatorId,
                        notificationId: notification.id,
                        title: "Prediction Result",
                        body: `Your prediction was correct! You won ${r.rewardAmount} points from the pool.`,
                        type: "race_result",
                    },
                });
            }
        }
    }

    eventBus.emit({
        type: "race:result_published",
        data: {
            raceId,
            resultId,
            timestamp: new Date().toISOString(),
        },
    });
}
