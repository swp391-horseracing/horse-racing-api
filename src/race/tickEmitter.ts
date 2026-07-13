import db from "../config/db.js";
import { races } from "../schema/races.js";
import { eq } from "drizzle-orm";
import {
    getSimulation,
    getCurrentTick,
    setCurrentTick,
    delRaceKeys,
} from "../cache/redis.js";
import { eventBus } from "../websocket/eventBus.js";
import type { FeRaceSimulation } from "./simulator.js";

interface StreamState {
    interval: NodeJS.Timeout;
    tickIndex: number;
    totalTicks: number;
}

class TickEmitter {
    private streams = new Map<string, StreamState>();

    async startRace(raceId: string): Promise<void> {
        if (this.streams.has(raceId)) {
            console.log(`[tickEmitter] Race ${raceId} already streaming`);
            return;
        }

        const simulation = await getSimulation(raceId);
        if (!simulation) {
            console.error(`[tickEmitter] No simulation for race ${raceId}`);
            return;
        }

        await setCurrentTick(raceId, 0);
        this.startStream(raceId, simulation, 0);
    }

    async resumeRace(raceId: string): Promise<void> {
        if (this.streams.has(raceId)) return;

        const simulation = await getSimulation(raceId);
        if (!simulation) {
            console.error(
                `[tickEmitter] No simulation to resume race ${raceId}`,
            );
            return;
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
        const interval = setInterval(async () => {
            const state = this.streams.get(raceId);
            if (!state) return;

            if (state.tickIndex >= state.totalTicks) {
                await this.finishRace(raceId, simulation);
                return;
            }

            const tick = simulation.ticks[state.tickIndex]!;

            eventBus.emit({
                type: "race:tick",
                data: { raceId, tick },
            });

            await setCurrentTick(raceId, state.tickIndex + 1);
            state.tickIndex++;

            const allFinished = tick.horses.every((h) => h.finished);
            if (allFinished || state.tickIndex >= state.totalTicks) {
                await this.finishRace(raceId, simulation);
            }
        }, simulation.tickIntervalMs);

        this.streams.set(raceId, {
            interval,
            tickIndex: startTick,
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
            clearInterval(state.interval);
            this.streams.delete(raceId);
        }
    }

    async cleanUpRace(raceId: string): Promise<void> {
        this.stopRace(raceId);
        await delRaceKeys(raceId);
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
