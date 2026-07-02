import { and, eq, sql } from "drizzle-orm";
import db from "../config/db.js";
import { tournaments } from "../schema/tournament.js";
import { eventBus } from "../websocket/eventBus.js";

export async function transitionTournaments(): Promise<void> {
    const now = new Date();

    await transitionUpcomingToRegistrationOpen(now);
    await transitionRegistrationOpenToClosed(now);
    await transitionRegistrationClosedToOngoing(now);
}

async function transitionUpcomingToRegistrationOpen(now: Date): Promise<void> {
    console.log("[cron:tournament] Checking upcoming → registration_open");
    const [updated] = await db
        .update(tournaments)
        .set({ status: "registration_open" })
        .where(
            and(
                eq(tournaments.status, "upcoming"),
                sql`${tournaments.registrationOpenDate} <= ${now}`,
            ),
        )
        .returning();

    if (updated) {
        console.log(
            `[cron:tournament] Transitioned ${updated.id} upcoming → registration_open`,
        );
        emitTournamentEvent(updated.id, "registration_open", "upcoming");
    }
}

async function transitionRegistrationOpenToClosed(now: Date): Promise<void> {
    console.log(
        "[cron:tournament] Checking registration_open → registration_closed",
    );
    const [updated] = await db
        .update(tournaments)
        .set({ status: "registration_closed" })
        .where(
            and(
                eq(tournaments.status, "registration_open"),
                sql`${tournaments.registrationCloseDate} <= ${now}`,
            ),
        )
        .returning();

    if (updated) {
        console.log(
            `[cron:tournament] Transitioned ${updated.id} registration_open → registration_closed`,
        );
        emitTournamentEvent(
            updated.id,
            "registration_closed",
            "registration_open",
        );
    }
}

async function transitionRegistrationClosedToOngoing(now: Date): Promise<void> {
    console.log("[cron:tournament] Checking registration_closed → ongoing");
    const [updated] = await db
        .update(tournaments)
        .set({ status: "ongoing" })
        .where(
            and(
                eq(tournaments.status, "registration_closed"),
                sql`${tournaments.startDate} <= ${now}`,
            ),
        )
        .returning();

    if (updated) {
        console.log(
            `[cron:tournament] Transitioned ${updated.id} registration_closed → ongoing`,
        );
        emitTournamentEvent(updated.id, "ongoing", "registration_closed");
    }
}

function emitTournamentEvent(
    tournamentId: string,
    status: string,
    previousStatus: string,
): void {
    try {
        eventBus.emit({
            type: "tournament:status_changed",
            data: {
                tournamentId,
                status,
                previousStatus,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (err) {
        console.error(`Failed to emit tournament:status_changed: ${err}`);
    }
}
