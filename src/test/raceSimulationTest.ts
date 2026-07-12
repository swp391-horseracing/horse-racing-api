import {
    generateReplay,
    type EntryData,
} from "../services/raceCalculate.js";

const entries: EntryData[] = [
    {
        entryId: "1",
        laneNumber: 1,
        entryStatus: "accepted",
        horse: {
            id: "h1",
            name: "Thunder",
            breed: "Arabian",
            baseSpeed: 18,
            stamina: 100,
            weightKg: 430,
        },
        jockey: { id: "j1", name: "John" },
    },
    {
        entryId: "2",
        laneNumber: 2,
        entryStatus: "accepted",
        horse: {
            id: "h2",
            name: "Flash",
            breed: "Arabian",
            baseSpeed: 16,
            stamina: 160,
            weightKg: 480,
        },
        jockey: { id: "j2", name: "Alex" },
    },
    {
        entryId: "3",
        laneNumber: 3,
        entryStatus: "accepted",
        horse: {
            id: "h3",
            name: "Storm",
            breed: "Arabian",
            baseSpeed: 19,
            stamina: 80,
            weightKg: 400,
        },
        jockey: { id: "j3", name: "David" },
    },
];

// FIX 1: Pass required second argument to generateReplay
// Check your raceCalculate.js to confirm what the second parameter should be
const TRACK_LENGTH = 600;
const MAX_RACE_TIME = 160;
const replay = generateReplay(TRACK_LENGTH,MAX_RACE_TIME, entries);

// FIX 2: Add validation to ensure state is not undefined

async function playRace() {
    // FIX 3: Add null check for replay array
    if (!replay || replay.length === 0) {
        console.error("No replay data generated");
        return;
    }

    printResults();
}

function printResults() {
    console.log("\n========== RESULTS ==========\n");

    // FIX 5: Add null check for replay
    if (!replay || replay.length === 0) {
        console.error("No replay data to display results");
        return;
    }

    const stats = replay.map((horse) => {
        const frames = horse.timeline;

        // FIX 6: Check if frames array is not empty
        if (frames.length === 0) {
            throw new Error(`No frames available for horse ${horse.horseName}`);
        }

        const finishTime = frames[frames.length - 1]!.time;

        let topSpeed = 0;
        for (const f of frames) {
            topSpeed = Math.max(topSpeed, f.speed);
        }

        const avgSpeed = (TRACK_LENGTH / finishTime) * 1000;
        const finalStamina = frames[frames.length - 1]!.stamina;

        // Time for the last 25% of the race (final sprint)
        const splitStart = frames.find(
            (f) => f.distance >= TRACK_LENGTH * 0.75,
        );
        const kickTime = splitStart
            ? (finishTime - splitStart.time) / 1000
            : null;

        return {
            name: horse.horseName,
            finishTime,
            avgSpeed,
            topSpeed,
            kickTime,
            finalStamina,
        };
    });

    stats.sort((a, b) => a.finishTime - b.finishTime);

    // FIX 7: Check if stats array is not empty
    if (stats.length === 0) {
        console.log("No statistics to display");
        return;
    }

    const winnerTime = stats[0]!.finishTime;

    stats.forEach((s, index) => {
        const gap =
            index === 0
                ? "-"
                : `+${((s.finishTime - winnerTime) / 1000).toFixed(2)}s`;

        console.log(
            `${index + 1}. ${s.name.padEnd(12)} ${(s.finishTime / 1000).toFixed(2)}s  gap ${gap.padEnd(8)} avg ${s.avgSpeed.toFixed(2)}m/s final sprint (last ${TRACK_LENGTH * 0.3}) ${s.kickTime?.toFixed(2) ?? "-"}s  Final STA ${s.finalStamina.toFixed(1)}`,
        );
    });
}

await playRace();
