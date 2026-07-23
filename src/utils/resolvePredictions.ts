import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { predictions } from "../schema/predictions.js";
import { raceConfigs } from "../schema/raceConfig.js";
import { wallets } from "../schema/wallets.js";
import { walletTransactions } from "../schema/walletTransaction.js";
import { notifications } from "../schema/notifications.js";
import { eventBus } from "../websocket/eventBus.js";

export async function resolvePredictions(
    raceId: string,
    resultId: string,
    tx: PgTransaction<
        NodePgQueryResultHKT,
        Record<string, never>,
        ExtractTablesWithRelations<Record<string, never>>
    >,
): Promise<void> {
    const [config] = await tx
        .select({ points: raceConfigs.predictionRewardPoints })
        .from(raceConfigs)
        .where(eq(raceConfigs.raceId, raceId));

    const rewardAmount = config?.points ?? 100;

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
        })
        .from(predictions)
        .where(
            and(eq(predictions.raceId, raceId), isNull(predictions.isCorrect)),
        );

    const correctIds: string[] = [];
    const incorrectIds: string[] = [];
    const correctSpectatorIds: string[] = [];

    for (const p of pendingPredictions) {
        const actualPosition = resultMap.get(p.predictedEntryId);
        if (actualPosition === p.predictedPosition) {
            correctIds.push(p.id);
            correctSpectatorIds.push(p.spectatorId);
        } else {
            incorrectIds.push(p.id);
        }
    }

    await Promise.all([
        correctIds.length > 0
            ? tx
                  .update(predictions)
                  .set({
                      isCorrect: true,
                      rewardAmount: `${rewardAmount}.00`,
                  })
                  .where(inArray(predictions.id, correctIds))
            : Promise.resolve(),
        incorrectIds.length > 0
            ? tx
                  .update(predictions)
                  .set({ isCorrect: false })
                  .where(inArray(predictions.id, incorrectIds))
            : Promise.resolve(),
    ]);

    if (correctIds.length > 0) {
        for (const spectatorId of correctSpectatorIds) {
            const [wallet] = await tx
                .select({ id: wallets.id, balance: wallets.balance })
                .from(wallets)
                .where(eq(wallets.userId, spectatorId))
                .for("update");

            if (wallet) {
                await tx
                    .update(wallets)
                    .set({
                        balance: sql`${wallets.balance} + ${rewardAmount}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(wallets.id, wallet.id));

                await tx.insert(walletTransactions).values({
                    walletId: wallet.id,
                    type: "reward",
                    status: "completed",
                    amount: rewardAmount,
                    balanceBefore: wallet.balance,
                    balanceAfter: wallet.balance + rewardAmount,
                    referenceId: raceId,
                    description: "Correct prediction reward",
                });
            }

            const [notification] = await tx
                .insert(notifications)
                .values({
                    userId: spectatorId,
                    title: "Prediction Result",
                    body: `Your prediction was correct! You earned ${rewardAmount} points.`,
                    type: "race_result",
                    referenceId: raceId,
                    referenceType: "prediction",
                })
                .returning({ id: notifications.id });

            if (notification) {
                eventBus.emit({
                    type: "notification:created",
                    data: {
                        userId: spectatorId,
                        notificationId: notification.id,
                        title: "Prediction Result",
                        body: `Your prediction was correct! You earned ${rewardAmount} points.`,
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
