import db from "../config/db.js";
import { races } from "../schema/races.js";
import { raceEntries } from "../schema/raceEntries.js";
import { horses } from "../schema/horses.js";
import { users } from "../schema/users.js";
import { courseDistances } from "../schema/courseDistances.js";
import { eq } from "drizzle-orm";
import {
    precomputeRace,
    type HorseAttrs,
    type FeRaceSimulation,
} from "../race/simulator.js";
import { setSimulation, setCurrentTick } from "../cache/redis.js";

export async function precomputeRaceFromDb(
    raceId: string,
): Promise<FeRaceSimulation> {
    const [race] = await db
        .select({
            id: races.id,
            distanceMeters: courseDistances.distanceMeters,
        })
        .from(races)
        .innerJoin(
            courseDistances,
            eq(races.courseDistanceId, courseDistances.id),
        )
        .where(eq(races.id, raceId));

    if (!race) {
        throw new Error(`Race ${raceId} not found`);
    }

    const entries = await db
        .select({
            horseId: horses.id,
            horseName: horses.name,
            baseSpeed: horses.baseSpeed,
            stamina: horses.stamina,
            weightKg: horses.weightKg,
            breed: horses.breed,
            laneNumber: raceEntries.laneNumber,
            entryStatus: raceEntries.entryStatus,
            jockeyId: raceEntries.jockeyId,
            jockeyName: users.fullName,
        })
        .from(raceEntries)
        .innerJoin(horses, eq(raceEntries.horseId, horses.id))
        .leftJoin(users, eq(raceEntries.jockeyId, users.id))
        .where(eq(raceEntries.raceId, raceId));

    const confirmedEntries = entries.filter(
        (e) => e.entryStatus === "confirmed" && e.jockeyId !== null,
    );

    if (confirmedEntries.length === 0) {
        throw new Error(`Race ${raceId} has no confirmed entries`);
    }

    const horseAttrs: HorseAttrs[] = confirmedEntries.map((e) => ({
        horseId: e.horseId,
        name: e.horseName,
        baseSpeed: Number(e.baseSpeed),
        stamina: Number(e.stamina),
        weightKg: Number(e.weightKg ?? 450),
        breed: e.breed,
        jockeyId: e.jockeyId,
        jockeyName: e.jockeyName,
        laneNumber: e.laneNumber,
        entryStatus: e.entryStatus,
    }));

    const simulation = precomputeRace(horseAttrs, Number(race.distanceMeters));

    await setSimulation(raceId, simulation);
    await setCurrentTick(raceId, 0);

    console.log(
        `[precompute] Race ${raceId} — ${simulation.totalTicks} ticks, ${simulation.totalDurationMs}ms, ${simulation.finalResults.length} finishers`,
    );

    return simulation;
}
