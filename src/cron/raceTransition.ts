import { and, eq, sql } from "drizzle-orm";
import db from "../config/db.js";
import { races } from "../schema/races.js";
import { eventBus } from "../websocket/eventBus.js";
import { PRE_RACE_WINDOW_MINUTES } from "./constants.js";

export async function transitionRaces(): Promise<void> {
    const now = new Date();

    await transitionScheduledToPreRace(now);
    await transitionPreRaceToOngoing(now);
}

async function transitionScheduledToPreRace(now: Date): Promise<void> {
    console.log("[cron:race] Checking scheduled → pre_race");
    const windowMs = PRE_RACE_WINDOW_MINUTES * 60 * 1000;
    const windowTime = new Date(now.getTime() + windowMs);

    const updatedRaces = await db
        .update(races)
        .set({ status: "pre_race" })
        .where(
            and(
                eq(races.status, "scheduled"),
                sql`${races.scheduleAt} <= ${windowTime}`,
            ),
        )
        .returning();

    for (const race of updatedRaces) {
        console.log(`[cron:race] Transitioned ${race.id} scheduled → pre_race`);
        emitRaceEvent(race.id, "pre_race", "scheduled");
    }
}

async function transitionPreRaceToOngoing(now: Date): Promise<void> {
    console.log("[cron:race] Checking pre_race → ongoing");
    const updatedRaces = await db
        .update(races)
        .set({ status: "ongoing" })
        .where(
            and(
                eq(races.status, "pre_race"),
                sql`${races.scheduleAt} <= ${now}`,
            ),
        )
        .returning();

    for (const race of updatedRaces) {
        console.log(`[cron:race] Transitioned ${race.id} pre_race → ongoing`);
        emitRaceEvent(race.id, "ongoing", "pre_race");
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
