import { and, eq, sql } from "drizzle-orm";
import db from "../config/db.js";
import { races } from "../schema/races.js";
import { eventBus } from "../websocket/eventBus.js";
import { PRE_RACE_WINDOW_MINUTES } from "./constants.js";
import { precomputeRaceFromDb } from "./precompute.js";
import { tickEmitter } from "../race/tickEmitter.js";

export async function transitionRaces(): Promise<void> {
    await transitionScheduledToPreRace();
    await transitionPreRaceToOngoing();
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
            console.error(
                `[cron:race] Failed to precompute ${race.id}:`,
                err,
            );
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
        await tickEmitter.startRace(race.id);
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
