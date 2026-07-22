import cron, { type ScheduledTask } from "node-cron";
import { transitionTournaments } from "./tournamentTransition.js";
import {
    transitionRaces,
    transitionPreRaceToOngoing,
} from "./raceTransition.js";
import { tickEmitter } from "../race/tickEmitter.js";
import { CRON_EVERY_5_MIN, CRON_EVERY_1_MIN } from "./constants.js";

let tournamentJob: ScheduledTask | null = null;
let raceJob: ScheduledTask | null = null;
let startRaceJob: ScheduledTask | null = null;

export function startScheduler(): void {
    console.log("[cron] Starting scheduler...");

    tournamentJob = cron.schedule(
        CRON_EVERY_5_MIN,
        async () => {
            try {
                await transitionTournaments();
            } catch (err) {
                console.error("[cron] Tournament transition error:", err);
            }
        },
        { noOverlap: true },
    );

    raceJob = cron.schedule(
        CRON_EVERY_5_MIN,
        async () => {
            try {
                await transitionRaces();
            } catch (err) {
                console.error("[cron] Race transition error:", err);
            }
        },
        { noOverlap: true },
    );

    startRaceJob = cron.schedule(
        CRON_EVERY_1_MIN,
        async () => {
            try {
                await transitionPreRaceToOngoing();
                await tickEmitter.resumeActiveRaces();
            } catch (err) {
                console.error("[cron] Race start error:", err);
            }
        },
        { noOverlap: true },
    );

    console.log(
        "[cron] Scheduler started (tournaments: 5min, races: 5min, race-start: 1min)",
    );
}

export function stopScheduler(): void {
    tournamentJob?.stop();
    raceJob?.stop();
    startRaceJob?.stop();
    console.log("[cron] Scheduler stopped");
}
