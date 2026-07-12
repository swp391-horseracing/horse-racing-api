
export interface EntryData {
    entryId: string;
    laneNumber: number;
    entryStatus: string;
    horse: {
        id: string;
        name: string;
        breed: string;
        baseSpeed: number;
        stamina: number;
        weightKg: number;
    };
    jockey: {
        id: string;
        name: string;
    };
}

export interface ReplayFrame {
    time: number;
    distance: number;
    speed: number;
    stamina: number;
}

export interface HorseReplay {
    entryId: string;
    horseId: string;
    horseName: string;
    laneNumber: number;
    finishTime: number | null;
    finishStatus: "finished" | "dnf";
    timeline: ReplayFrame[];
}


const DT = 0.05; // Δt

const K = 1.4; // base consumption coefficient
const ALPHA = 0.5; // speed drop-off slope when stamina < 30

const REFERENCE_WEIGHT_KG = 450; // reference horse weight
const WEIGHT_STAMINA_INFLUENCE = 0.42; // weight only affects a fixed portion (40%) of stamina drain

const LATE_RACE_THRESHOLD = 0.6; // final stretch
const LATE_RACE_BOOST = 6; // amplifies surge magnitude in the final stretch

const SLUMP_CHANCE = 0.1;
const MIN_LATE_SURGE_PROBABILITY = 0.15; // even a tired horse keeps a small chance
const MAX_LATE_SURGE_PROBABILITY = 0.95; // a horse with plenty of stamina almost always surges
const SURGE_STAMINA_COST = 4; // surging costs extra stamina
const SURGE_STAMINA_BONUS = 0.8; // max bonus to surge magnitude based on remaining stamina %

function random(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

interface SpeedResult {
    speed: number;
    surged: boolean;
}

function lateRaceFactor(progress: number) {
    return progress >= LATE_RACE_THRESHOLD
        ? 1 +
              ((progress - LATE_RACE_THRESHOLD) / (1 - LATE_RACE_THRESHOLD)) *
                  (LATE_RACE_BOOST - 1)
        : 1;
}

// v_i(t) per the model, plus a surge mechanic for the final stretch
function calculateSpeed(
    vMax: number,
    stamina: number, // e_i(t-Δt)
    initialStamina: number, // E_i
    elapsed: number,
    progress: number,
    volatility: number,
    forceSurge: boolean,
): SpeedResult {
    const spread = random(0, volatility);

    let speed: number;

    if (elapsed < 10) {
        // first 10s: v_i(t) = vMax(i) x Ran(a,b)
        speed = vMax * random(0.75 - spread, 0.95 + spread);
    } else if (stamina > 30) {
        // v_i = vMax(i) x Ran()
        speed = vMax * random(0.85 - spread, 1 + spread);
    } else {
        // v_i = vMax(i) x (e_i/30)^alpha x Ran()
        speed =
            vMax *
            Math.pow(stamina / 30, ALPHA) *
            random(0.85 - spread, 1 + spread);
    }

    const lateFactor = lateRaceFactor(progress);

    let surged = false;

    if (forceSurge) {
        surged = true;

        // % stamina remaining at the moment of the surge -> more stamina left, stronger surge
        const staminaRatio = Math.max(0, Math.min(1, stamina / initialStamina));
        const staminaBonus = 1 + staminaRatio * SURGE_STAMINA_BONUS;

        speed *=
            random(
                1.4 + stamina / 60,
                3.15 + stamina / 80 + 0.25 * lateFactor,
            ) * staminaBonus;
    } else if (Math.random() < SLUMP_CHANCE * lateFactor) {
        speed *= random(0.6, 0.85);
    }

    return { speed, surged };
}

export function generateReplay(distance: number,raceTime: number, entries: EntryData[]): HorseReplay[] {
    const RACE_DISTANCE = distance;
    const MAX_RACE_TIME = raceTime;

    const result: HorseReplay[] = entries.map((entry) => {
        const vMax = entry.horse.baseSpeed; // vMax(i)
        const E = entry.horse.stamina; // E_i, initial stamina

        // weight affects part of the stamina drain rate, not all of it
        const weightFactor =
            1 +
            (entry.horse.weightKg / REFERENCE_WEIGHT_KG - 1) *
                WEIGHT_STAMINA_INFLUENCE;

        let e = E; // e_i(t), initialize e_i(0) = E_i
        let distance = 0; // S_i(t)
        let elapsed = 0;

        const volatility = random(0.03, 0.12);

        // the surge in final stretch,
        // based on how much stamina left
        let lateDecisionMade = false;
        let willSurgeLate = false;
        let surgeAtProgress: number | null = null;
        let hasSurged = false;

        const timeline: ReplayFrame[] = [
            { time: 0, distance: 0, speed: 0, stamina: e },
        ];

        while (distance < RACE_DISTANCE && elapsed < MAX_RACE_TIME) {
            const progress = distance / RACE_DISTANCE;

            if (!lateDecisionMade && progress >= LATE_RACE_THRESHOLD) {
                lateDecisionMade = true;

                const staminaRatio = Math.max(0, Math.min(1, e / E));
                const surgeProbability =
                    MIN_LATE_SURGE_PROBABILITY +
                    (MAX_LATE_SURGE_PROBABILITY - MIN_LATE_SURGE_PROBABILITY) *
                        staminaRatio;

                willSurgeLate = Math.random() < surgeProbability;
                surgeAtProgress = willSurgeLate ? random(progress, 1) : null;
            }

            const forceSurge =
                !hasSurged &&
                surgeAtProgress !== null &&
                progress >= surgeAtProgress;

            if (forceSurge) hasSurged = true;

            // v_i(t), using e_i(t-Δt)
            const { speed, surged } = calculateSpeed(
                vMax,
                e,
                E,
                elapsed,
                progress,
                volatility,
                forceSurge,
            );

            // k_i(t) = K x (E_i / e_i(t-Δt)) x weight
            const k =
                K * (E / e) * weightFactor * (surged ? SURGE_STAMINA_COST : 1);

            // e_i(t) = e_i(t-Δt) - [v_i(t-Δt)/vMax(i)] x Δt x k_i(t)
            e -= (speed / vMax) * DT * k;
            if (e < 5) e = 5;

            // S_i(t) = S_i(t-Δt) + v_i(t) x Δt
            distance += speed * DT;
            if (distance > RACE_DISTANCE) distance = RACE_DISTANCE;

            elapsed += DT;

            timeline.push({
                time: Math.round(elapsed * 1000),
                distance: Number(distance.toFixed(2)),
                speed: Number(speed.toFixed(2)),
                stamina: Number(e.toFixed(2)),
            });
        }

        const finished = distance >= RACE_DISTANCE;

        return {
            entryId: entry.entryId,
            horseId: entry.horse.id,
            horseName: entry.horse.name,
            laneNumber: entry.laneNumber,
            finishStatus: finished ? "finished" : "dnf",
            finishTime: finished ? elapsed : null,
            timeline,
        };
    });

    result.sort((a, b) => {
        if (a.finishStatus === "finished" && b.finishStatus === "dnf")
            return -1;
        if (a.finishStatus === "dnf" && b.finishStatus === "finished") return 1;

        if (a.finishStatus === "dnf" && b.finishStatus === "dnf") {
            return (
                b.timeline[b.timeline.length - 1]!.distance -
                a.timeline[a.timeline.length - 1]!.distance
            );
        }

        return a.finishTime! - b.finishTime!;
    });

    return result;
}
