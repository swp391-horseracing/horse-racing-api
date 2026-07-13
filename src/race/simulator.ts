import {
    generateReplay,
    type EntryData,
    type HorseReplay,
} from "../services/raceCalculate.js";

export interface HorseAttrs {
    horseId: string;
    name: string;
    baseSpeed: number;
    stamina: number;
    weightKg: number;
    breed: string;
    jockeyId: string | null;
    jockeyName: string | null;
    laneNumber: number;
    entryStatus: string;
}

export interface FeTickSnapshot {
    tickIndex: number;
    elapsedMs: number;
    horses: {
        horseId: string;
        name: string;
        positionM: number;
        progressPct: number;
        speedMs: number;
        finished: boolean;
    }[];
}

export interface FeFinalPlacement {
    horseId: string;
    name: string;
    position: number;
    finishTimeMs: number;
    finishStatus: "placed" | "dnf";
}

export interface FeRaceSimulation {
    raceDistanceM: number;
    tickIntervalMs: number;
    totalTicks: number;
    totalDurationMs: number;
    ticks: FeTickSnapshot[];
    finalResults: FeFinalPlacement[];
}

const OUTPUT_TICK_MS = 200;
const FRAME_INTERVAL_MS = 50; // DT = 0.05s from raceCalculate.ts
const SAMPLE_STEP = OUTPUT_TICK_MS / FRAME_INTERVAL_MS; // 4

function getFrameAt(horse: HorseReplay, frameIdx: number, raceDistanceM: number) {
    if (frameIdx < horse.timeline.length) {
        const f = horse.timeline[frameIdx]!;
        return { distance: f.distance, speed: f.speed, finished: f.distance >= raceDistanceM };
    }
    const last = horse.timeline[horse.timeline.length - 1]!;
    const finished = last.distance >= raceDistanceM;
    return {
        distance: finished ? raceDistanceM : last.distance,
        speed: 0,
        finished,
    };
}

export function precomputeRace(
    horses: HorseAttrs[],
    raceDistanceM: number,
): FeRaceSimulation {
    const maxRaceTime = raceDistanceM / 8;

    const entries: EntryData[] = horses.map((h) => ({
        entryId: h.horseId,
        laneNumber: h.laneNumber,
        entryStatus: h.entryStatus,
        horse: {
            id: h.horseId,
            name: h.name,
            breed: h.breed,
            baseSpeed: h.baseSpeed,
            stamina: h.stamina,
            weightKg: h.weightKg,
        },
        jockey: {
            id: h.jockeyId ?? "",
            name: h.jockeyName ?? "",
        },
    }));

    const replays = generateReplay(raceDistanceM, maxRaceTime, entries);

    const maxFrames = Math.max(...replays.map((r) => r.timeline.length));
    const totalTicks = Math.ceil(maxFrames / SAMPLE_STEP);

    const ticks: FeTickSnapshot[] = [];

    for (let tick = 0; tick < totalTicks; tick++) {
        const frameIdx = tick * SAMPLE_STEP;
        const elapsedMs = Math.min(frameIdx * FRAME_INTERVAL_MS, replays.reduce((max, r) => Math.max(max, r.timeline[r.timeline.length - 1]?.time ?? 0), 0));

        ticks.push({
            tickIndex: tick,
            elapsedMs,
            horses: replays.map((r) => {
                const frame = getFrameAt(r, frameIdx, raceDistanceM);
                return {
                    horseId: r.horseId,
                    name: r.horseName,
                    positionM: Number(frame.distance.toFixed(2)),
                    progressPct: Number(((frame.distance / raceDistanceM) * 100).toFixed(2)),
                    speedMs: Number(frame.speed.toFixed(2)),
                    finished: frame.finished,
                };
            }),
        });
    }

    const totalDurationMs = ticks.length > 0 ? ticks[ticks.length - 1]!.elapsedMs : 0;

    const finishedHorses = replays
        .filter((r) => r.finishStatus === "finished")
        .sort((a, b) => (a.finishTime ?? 0) - (b.finishTime ?? 0));
    const dnfHorses = replays.filter((r) => r.finishStatus !== "finished");

    const finalResults: FeFinalPlacement[] = [
        ...finishedHorses.map((r, i) => ({
            horseId: r.horseId,
            name: r.horseName,
            position: i + 1,
            finishTimeMs: Math.round((r.finishTime ?? 0) * 1000),
            finishStatus: "placed" as const,
        })),
        ...dnfHorses.map((r) => ({
            horseId: r.horseId,
            name: r.horseName,
            position: finishedHorses.length + 1,
            finishTimeMs: totalDurationMs,
            finishStatus: "dnf" as const,
        })),
    ];

    return {
        raceDistanceM,
        tickIntervalMs: OUTPUT_TICK_MS,
        totalTicks: ticks.length,
        totalDurationMs,
        ticks,
        finalResults,
    };
}
