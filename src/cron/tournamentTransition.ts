import { and, eq, sql } from "drizzle-orm";
import db from "../config/db.js";
import { tournaments } from "../schema/tournament.js";
import { eventBus } from "../websocket/eventBus.js";

export async function transitionTournaments(): Promise<void> {
    await transitionUpcomingToRegistrationOpen();
    await transitionRegistrationOpenToClosed();
    await transitionRegistrationClosedToOngoing();
}

async function transitionUpcomingToRegistrationOpen(): Promise<void> {
    console.log("[cron:tournament] Checking upcoming → registration_open");
    const updatedTournaments = await db
        .update(tournaments)
        .set({ status: "registration_open" })
        .where(
            and(
                eq(tournaments.status, "upcoming"),
                sql`${tournaments.registrationOpenDate} <= NOW()`,
            ),
        )
        .returning();

    for (const t of updatedTournaments) {
        console.log(
            `[cron:tournament] Transitioned ${t.id} upcoming → registration_open`,
        );
        emitTournamentEvent(t.id, "registration_open", "upcoming");
    }
}

async function transitionRegistrationOpenToClosed(): Promise<void> {
    console.log(
        "[cron:tournament] Checking registration_open → registration_closed",
    );
    const updatedTournaments = await db
        .update(tournaments)
        .set({ status: "registration_closed" })
        .where(
            and(
                eq(tournaments.status, "registration_open"),
                sql`${tournaments.registrationCloseDate} <= NOW()`,
            ),
        )
        .returning();

    for (const t of updatedTournaments) {
        console.log(
            `[cron:tournament] Transitioned ${t.id} registration_open → registration_closed`,
        );
        emitTournamentEvent(t.id, "registration_closed", "registration_open");
    }
}

async function transitionRegistrationClosedToOngoing(): Promise<void> {
    console.log("[cron:tournament] Checking registration_closed → ongoing");
    const updatedTournaments = await db
        .update(tournaments)
        .set({ status: "ongoing" })
        .where(
            and(
                eq(tournaments.status, "registration_closed"),
                sql`${tournaments.startDate} <= NOW()`,
            ),
        )
        .returning();

    for (const t of updatedTournaments) {
        console.log(
            `[cron:tournament] Transitioned ${t.id} registration_closed → ongoing`,
        );
        emitTournamentEvent(t.id, "ongoing", "registration_closed");
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
