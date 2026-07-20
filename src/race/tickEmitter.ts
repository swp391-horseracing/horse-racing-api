import db from "../config/db.js";
import { races } from "../schema/races.js";
import { raceResults } from "../schema/raceResults.js";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { raceEntries } from "../schema/raceEntries.js";
import { and, eq } from "drizzle-orm";
import {
    getSimulation,
    getCurrentTick,
    setCurrentTick,
    delRaceKeys,
} from "../cache/redis.js";
import { eventBus } from "../websocket/eventBus.js";
import { precomputeRaceFromDb } from "../cron/precompute.js";
import type { FeRaceSimulation } from "./simulator.js";

interface StreamState {
    interval: NodeJS.Timeout;
    tickIndex: number;
    totalTicks: number;
}

class TickEmitter {
    private streams = new Map<string, StreamState>();
    private testRaces = new Set<string>();

    async startTestRace(
        raceId: string,
        simulation: FeRaceSimulation,
    ): Promise<boolean> {
        if (this.streams.has(raceId)) return false;
        this.testRaces.add(raceId);
        await setCurrentTick(raceId, 0);
        this.startStream(raceId, simulation, 0);
        return true;
    }

    async startRace(raceId: string): Promise<void> {
        if (this.streams.has(raceId)) {
            console.log(`[tickEmitter] Race ${raceId} already streaming`);
            return;
        }

        let simulation = await getSimulation(raceId);
        if (!simulation) {
            console.warn(
                `[tickEmitter] Missing simulation for ${raceId} — recomputing...`,
            );
            try {
                simulation = await precomputeRaceFromDb(raceId);
            } catch (err) {
                console.error(
                    `[tickEmitter] Failed to recompute simulation for ${raceId}:`,
                    err,
                );
                return;
            }
        }

        await setCurrentTick(raceId, 0);
        this.startStream(raceId, simulation, 0);
    }

    async resumeRace(raceId: string): Promise<void> {
        if (this.streams.has(raceId)) return;

        let simulation = await getSimulation(raceId);
        if (!simulation) {
            console.warn(
                `[tickEmitter] Missing simulation to resume ${raceId} — recomputing...`,
            );
            try {
                simulation = await precomputeRaceFromDb(raceId);
            } catch (err) {
                console.error(
                    `[tickEmitter] Failed to recompute simulation for ${raceId}:`,
                    err,
                );
                return;
            }
        }

        const tickIndex = await getCurrentTick(raceId);
        if (tickIndex >= simulation.totalTicks) {
            console.log(`[tickEmitter] Race ${raceId} already fully streamed`);
            return;
        }

        console.log(
            `[tickEmitter] Resuming race ${raceId} from tick ${tickIndex}`,
        );
        this.startStream(raceId, simulation, tickIndex);
    }

    private startStream(
        raceId: string,
        simulation: FeRaceSimulation,
        startTick: number,
    ): void {
        let tickIndex = startTick;
        let timeout: NodeJS.Timeout;

        const tick = async () => {
            try {
                if (tickIndex >= simulation.totalTicks) {
                    await this.finishRace(raceId, simulation);
                    return;
                }

                const snapshot = simulation.ticks[tickIndex]!;

                eventBus.emit({
                    type: "race:tick",
                    data: { raceId, tick: snapshot },
                });

                await setCurrentTick(raceId, tickIndex + 1);
                tickIndex++;

                const state = this.streams.get(raceId);
                if (state) {
                    state.tickIndex = tickIndex;
                } else {
                    return; // race was stopped externally
                }

                const allFinished = snapshot.horses.every((h) => h.finished);
                if (allFinished || tickIndex >= simulation.totalTicks) {
                    await this.finishRace(raceId, simulation);
                    return;
                }

                timeout = setTimeout(tick, simulation.tickIntervalMs);
            } catch (err) {
                console.error(`[tickEmitter] Error in race ${raceId}:`, err);
                if (this.streams.has(raceId)) {
                    timeout = setTimeout(tick, simulation.tickIntervalMs);
                }
            }
        };

        timeout = setTimeout(tick, simulation.tickIntervalMs);

        this.streams.set(raceId, {
            interval: timeout,
            tickIndex,
            totalTicks: simulation.totalTicks,
        });
    }

    private async finishRace(
        raceId: string,
        simulation: FeRaceSimulation,
    ): Promise<void> {
        this.stopRace(raceId);

        eventBus.emit({
            type: "race:finish",
            data: {
                raceId,
                finalResults: simulation.finalResults,
            },
        });

        if (this.testRaces.delete(raceId)) {
            console.log(`[tickEmitter] Test race ${raceId} finished`);
            return;
        }

        try {
            await this.fillRaceResultsFromSimulation(raceId, simulation);
        } catch (err) {
            console.error(
                `[tickEmitter] Failed to fill results for race ${raceId}:`,
                err,
            );
        }

        eventBus.emit({
            type: "race:status_changed",
            data: {
                raceId,
                status: "under_review",
                previousStatus: "ongoing",
                timestamp: new Date().toISOString(),
            },
        });

        await db
            .update(races)
            .set({ status: "under_review" })
            .where(eq(races.id, raceId));

        console.log(`[tickEmitter] Race ${raceId} finished → under_review`);
    }

    stopRace(raceId: string): void {
        const state = this.streams.get(raceId);
        if (state) {
            clearTimeout(state.interval);
            this.streams.delete(raceId);
        }
        this.testRaces.delete(raceId);
    }

    async cleanUpRace(raceId: string): Promise<void> {
        this.stopRace(raceId);
        await delRaceKeys(raceId);
    }

    private async fillRaceResultsFromSimulation(
        raceId: string,
        simulation: FeRaceSimulation,
    ): Promise<void> {
        if (this.testRaces.has(raceId)) return;

        await db.transaction(async (tx) => {
            const [inserted] = await tx
                .insert(raceResults)
                .values({ raceId })
                .onConflictDoNothing()
                .returning({ id: raceResults.id });

            let resultId: string;
            if (inserted) {
                resultId = inserted.id;
            } else {
                const [existing] = await tx
                    .select({ id: raceResults.id })
                    .from(raceResults)
                    .where(eq(raceResults.raceId, raceId));
                if (!existing) return;
                resultId = existing.id;
            }

            await tx
                .delete(raceResultEntries)
                .where(eq(raceResultEntries.raceId, raceId));

            const entries = await tx
                .select({ id: raceEntries.id, horseId: raceEntries.horseId })
                .from(raceEntries)
                .where(
                    and(
                        eq(raceEntries.raceId, raceId),
                        eq(raceEntries.entryStatus, "confirmed"),
                    ),
                );

            const entryByHorse = new Map(
                entries.map((e) => [e.horseId, e.id]),
            );

            const values = simulation.finalResults
                .filter((f) => entryByHorse.has(f.horseId))
                .map((f) => {
                    const finished = f.finishStatus === "placed";
                    return {
                        raceId,
                        resultId,
                        entryId: entryByHorse.get(f.horseId)!,
                        finishedPosition: f.position,
                        finishTime: f.finishTimeMs?.toString() ?? null,
                        finishStatus: finished
                            ? ("finished" as const)
                            : ("dnf" as const),
                        points: finished ? Math.max(10 - f.position, 1) : 0,
                        basePoints: finished ? Math.max(10 - f.position, 1) : 0,
                    };
                });

            if (values.length === 0) return;

            await tx.insert(raceResultEntries).values(values);
        });
    }

    async resumeActiveRaces(): Promise<void> {
        console.log("[tickEmitter] Resuming active races...");
        const ongoingRaces = await db
            .select({ id: races.id })
            .from(races)
            .where(eq(races.status, "ongoing"));

        for (const race of ongoingRaces) {
            await this.resumeRace(race.id);
        }
    }
}

export const tickEmitter = new TickEmitter();
