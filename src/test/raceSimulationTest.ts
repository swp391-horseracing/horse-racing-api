import {
    generateReplay,
    type EntryData,
    type HorseReplay,
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

const TRACK_LENGTH = 600;
const MAX_RACE_TIME = 100;
const replay = generateReplay(TRACK_LENGTH, MAX_RACE_TIME, entries);

function createRaceTable(replay: HorseReplay[]): string[][] {
    if (!replay || replay.length === 0) {
        return [];
    }

    const maxFrames = Math.max(...replay.map((h) => h.timeline.length));

    const header = ["Time (ms)", ...replay.map((h) => h.horseName)];
    const table: string[][] = [header];

    for (let frame = 0; frame < maxFrames; frame++) {
        const row: string[] = [];

        const firstHorse = replay[0];
        if (!firstHorse) {
            continue;
        }

        let currentTime: number;
        if (frame < firstHorse.timeline.length) {
            const frameData = firstHorse.timeline[frame];
            if (frameData) {
                currentTime = frameData.time;
            } else {
                currentTime = frame * 1000;
            }
        } else {
            const lastFrame =
                firstHorse.timeline[firstHorse.timeline.length - 1];
            if (lastFrame) {
                currentTime =
                    lastFrame.time +
                    (frame - firstHorse.timeline.length + 1) * 1000;
            } else {
                currentTime = frame * 1000;
            }
        }

        row.push(currentTime.toString());

        for (const horse of replay) {
            if (frame < horse.timeline.length) {
                const frameData = horse.timeline[frame];
                if (frameData) {
                    const distance = frameData.distance.toFixed(2);
                    row.push(distance);
                } else {
                    row.push(TRACK_LENGTH.toFixed(2));
                }
            } else {
                row.push(TRACK_LENGTH.toFixed(2));
            }
        }

        table.push(row);
    }

    return table;
}

function printRaceTable(table: string[][]): void {
    if (table.length === 0) {
        console.log("No data to display");
        return;
    }

    const firstRow = table[0];
    if (!firstRow) {
        console.log("No data to display");
        return;
    }

    const colWidths = firstRow.map((_, colIndex) => {
        const maxWidth = Math.max(
            ...table.map((row) => {
                const cell = row[colIndex];
                return cell ? cell.length : 0;
            }),
        );
        return maxWidth + 2;
    });

    const headerRow = firstRow
        .map((cell, i) => cell.padEnd(colWidths[i]!))
        .join("| ");
    console.log(headerRow);
    console.log("-".repeat(headerRow.length));

    for (let i = 1; i < table.length; i++) {
        const row = table[i];
        if (!row) continue;

        const formattedRow = row
            .map((cell, j) => {
                const width = colWidths[j] || 0;
                return (cell || "").padEnd(width);
            })
            .join("| ");
        console.log(formattedRow);
    }
}

async function playRace() {
    if (!replay || replay.length === 0) {
        console.error("No replay data generated");
        return;
    }

    printResults();

    console.log("\n========== RACE PROGRESS TABLE ==========\n");
    console.log("(Showing distance in meters at each time step)\n");
    const raceTable = createRaceTable(replay);
    printRaceTable(raceTable);
    console.log("\n==========================================\n");

    // Show raw replay data for each horse
    console.log("\n========== RAW REPLAY DATA ==========\n");
    for (const horse of replay) {
        console.log(
            `\n--- ${horse.horseName} (Entry ID: ${horse.entryId}, Lane: ${horse.laneNumber}) ---`,
        );
        console.log(`Finish Status: ${horse.finishStatus}`);
        console.log(
            `Finish Time: ${horse.finishTime !== null ? (horse.finishTime / 1000).toFixed(2) + "s" : "N/A"}`,
        );
        console.log(`Timeline Frames: ${horse.timeline.length}\n`);

        console.log("race", JSON.stringify(horse, null, 2));
        console.log("\n");
    }
    console.log("==========================================\n");
}

function printResults() {
    console.log("\n========== RESULTS ==========\n");

    if (!replay || replay.length === 0) {
        console.error("No replay data to display results");
        return;
    }

    const stats = replay.map((horse) => {
        const frames = horse.timeline;

        if (frames.length === 0) {
            throw new Error(`No frames available for horse ${horse.horseName}`);
        }

        const lastFrame = frames[frames.length - 1];
        if (!lastFrame) {
            throw new Error(`Invalid last frame for horse ${horse.horseName}`);
        }

        const finishTime = lastFrame.time;

        let topSpeed = 0;
        for (const f of frames) {
            topSpeed = Math.max(topSpeed, f.speed);
        }

        const avgSpeed = (TRACK_LENGTH / finishTime) * 1000;
        const finalStamina = lastFrame.stamina;

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

    if (stats.length === 0) {
        console.log("No statistics to display");
        return;
    }

    const firstStat = stats[0];
    if (!firstStat) {
        console.log("No statistics to display");
        return;
    }

    const winnerTime = firstStat.finishTime;

    stats.forEach((s, index) => {
        const gap =
            index === 0
                ? "-"
                : `+${((s.finishTime - winnerTime) / 1000).toFixed(2)}s`;

        console.log(
            `${index + 1}. ${s.name.padEnd(12)} ${(s.finishTime / 1000).toFixed(2)}s  gap ${gap.padEnd(8)} avg ${s.avgSpeed.toFixed(2)}m/s  final stretch(${TRACK_LENGTH * 0.25}m) ${s.kickTime?.toFixed(2) ?? "-"}s  final STA ${s.finalStamina.toFixed(1)}`,
        );
    });
}

await playRace();
