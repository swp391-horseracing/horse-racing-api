import cron, { type ScheduledTask } from "node-cron";
import { transitionTournaments } from "./tournamentTransition.js";
import { transitionRaces } from "./raceTransition.js";
import { CRON_EVERY_5_MIN, CRON_EVERY_1_MIN } from "./constants.js";

let tournamentJob: ScheduledTask | null = null;
let raceJob: ScheduledTask | null = null;
let precisionRaceJob: ScheduledTask | null = null;

export function startScheduler(): void {
    console.log("[cron] Starting scheduler...");

    tournamentJob = cron.schedule(CRON_EVERY_5_MIN, async () => {
        try {
            await transitionTournaments();
        } catch (err) {
            console.error("[cron] Tournament transition error:", err);
        }
    });

    raceJob = cron.schedule(CRON_EVERY_5_MIN, async () => {
        try {
            await transitionRaces();
        } catch (err) {
            console.error("[cron] Race transition error:", err);
        }
    });

    precisionRaceJob = cron.schedule(CRON_EVERY_1_MIN, async () => {
        try {
            await transitionRaces();
        } catch (err) {
            console.error("[cron] Precision race transition error:", err);
        }
    });

    console.log("[cron] Scheduler started (tournaments: 5min, races: 5min + 1min precision)");
}

export function stopScheduler(): void {
    tournamentJob?.stop();
    raceJob?.stop();
    precisionRaceJob?.stop();
    console.log("[cron] Scheduler stopped");
}
