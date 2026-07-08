import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { predictions } from "../schema/predictions.js";

export async function resolvePredictions(
    raceId: string,
    tx: PgTransaction<
        NodePgQueryResultHKT,
        Record<string, never>,
        ExtractTablesWithRelations<Record<string, never>>
    >,
) {
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
            predictedEntryId: predictions.predictedEntryId,
            predictedPosition: predictions.predictedPosition,
        })
        .from(predictions)
        .where(
            and(eq(predictions.raceId, raceId), isNull(predictions.isCorrect)),
        );

    const correctIds: string[] = [];
    const incorrectIds: string[] = [];

    for (const p of pendingPredictions) {
        const actualPosition = resultMap.get(p.predictedEntryId);
        if (actualPosition === p.predictedPosition) {
            correctIds.push(p.id);
        } else {
            incorrectIds.push(p.id);
        }
    }

    await Promise.all([
        correctIds.length > 0
            ? tx
                  .update(predictions)
                  .set({ isCorrect: true, rewardAmount: "100.00" })
                  .where(inArray(predictions.id, correctIds))
            : Promise.resolve(),
        incorrectIds.length > 0
            ? tx
                  .update(predictions)
                  .set({ isCorrect: false })
                  .where(inArray(predictions.id, incorrectIds))
            : Promise.resolve(),
    ]);
}
