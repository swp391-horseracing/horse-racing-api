import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import db from "../../config/db.js";
import { and, eq, sql } from "drizzle-orm";
import { raceEntries } from "../../schema/raceEntries.js";
import { races } from "../../schema/races.js";
import { horses } from "../../schema/horses.js";
import { tournamentRegistrations } from "../../schema/tournamentRegistrations.js";
import { createRaceEntryRequest } from "../../validator/raceEntry.js";

const RACE_ENTRY_STATUS = "scheduled";

export const createRaceEntry = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const parsed = createRaceEntryRequest.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        const { horseId } = parsed.data;

        const result = await db.transaction(async (tx) => {
            // Verify race exists and is in scheduled status
            const [race] = await tx
                .select({
                    id: races.id,
                    tournamentId: races.tournamentId,
                    status: races.status,
                    laneCount: races.laneCount,
                })
                .from(races)
                .where(eq(races.id, raceId));

            if (!race) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Race not found",
                };
            }
            if (race.status !== RACE_ENTRY_STATUS) {
                return {
                    ok: false as const,
                    status: 409,
                    message: "Race is no longer accepting entries",
                };
            }

            // Verify horse belongs to the owner
            const [horse] = await tx
                .select({ id: horses.id })
                .from(horses)
                .where(
                    and(eq(horses.id, horseId), eq(horses.ownerId, user.id)),
                );

            if (!horse) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "No horse found",
                };
            }

            // Verify horse has an approved tournament registration
            const [registration] = await tx
                .select({
                    registrationId: tournamentRegistrations.registrationId,
                })
                .from(tournamentRegistrations)
                .where(
                    and(
                        eq(tournamentRegistrations.horseId, horseId),
                        eq(
                            tournamentRegistrations.tournamentId,
                            race.tournamentId,
                        ),
                        eq(tournamentRegistrations.status, "approved"),
                    ),
                );

            if (!registration) {
                return {
                    ok: false as const,
                    status: 403,
                    message: "Horse is not registered in this tournament",
                };
            }

            // Check race has available slots
            const [slotCount] = await tx
                .select({
                    count: sql<number>`count(*)`,
                })
                .from(raceEntries)
                .where(eq(raceEntries.raceId, raceId));

            if (
                race.laneCount !== null &&
                slotCount &&
                slotCount.count >= race.laneCount
            ) {
                return {
                    ok: false as const,
                    status: 409,
                    message: "Race is full",
                };
            }

            // Check horse not already entered in this race (DB unique constraint handles this too)
            const [existingEntry] = await tx
                .select({ id: raceEntries.id })
                .from(raceEntries)
                .where(
                    and(
                        eq(raceEntries.raceId, raceId),
                        eq(raceEntries.horseId, horseId),
                    ),
                );

            if (existingEntry) {
                return {
                    ok: false as const,
                    status: 409,
                    message: "Horse is already entered in this race",
                };
            }

            // Check horse not entered in another race at the same scheduleAt
            if (race.laneCount !== null) {
                // Get the scheduleAt of this race
                const [thisRace] = await tx
                    .select({ scheduleAt: races.scheduleAt })
                    .from(races)
                    .where(eq(races.id, raceId));

                if (thisRace?.scheduleAt) {
                    const [conflict] = await tx
                        .select({ id: raceEntries.id })
                        .from(raceEntries)
                        .innerJoin(races, eq(raceEntries.raceId, races.id))
                        .where(
                            and(
                                eq(raceEntries.horseId, horseId),
                                eq(races.scheduleAt, thisRace.scheduleAt),
                            ),
                        )
                        .limit(1);

                    if (conflict) {
                        return {
                            ok: false as const,
                            status: 409,
                            message: "Horse is already racing at this time",
                        };
                    }
                }
            }

            // Auto-assign next available lane number
            const usedLanes = new Set(
                (
                    await tx
                        .select({ laneNumber: raceEntries.laneNumber })
                        .from(raceEntries)
                        .where(eq(raceEntries.raceId, raceId))
                ).map((r) => r.laneNumber),
            );

            let nextLane = 1;
            while (usedLanes.has(nextLane)) {
                nextLane++;
            }

            const [entry] = await tx
                .insert(raceEntries)
                .values({
                    raceId,
                    horseId,
                    laneNumber: nextLane,
                    entryStatus: "pending",
                })
                .returning();

            return { ok: true as const, entry };
        });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        return res.status(201).json({ entry: result.entry });
    } catch (err) {
        next(err);
    }
};

export const withdrawRaceEntry = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;
        const { raceId, entryId } = req.params as {
            raceId: string;
            entryId: string;
        };
        if (!uuidValidate(raceId) || !uuidValidate(entryId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const result = await db.transaction(async (tx) => {
            // Verify race exists and is in scheduled status
            const [race] = await tx
                .select({ id: races.id, status: races.status })
                .from(races)
                .where(eq(races.id, raceId));

            if (!race) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Race not found",
                };
            }
            if (race.status !== RACE_ENTRY_STATUS) {
                return {
                    ok: false as const,
                    status: 409,
                    message: "Can only withdraw in scheduled stage",
                };
            }

            // Verify entry exists and belongs to owner's horse
            const [existing] = await tx
                .select({ id: raceEntries.id })
                .from(raceEntries)
                .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                .where(
                    and(
                        eq(raceEntries.id, entryId),
                        eq(raceEntries.raceId, raceId),
                        eq(horses.ownerId, user.id),
                    ),
                );

            if (!existing) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Entry not found",
                };
            }

            await tx
                .delete(raceEntries)
                .where(
                    and(
                        eq(raceEntries.id, entryId),
                        eq(raceEntries.raceId, raceId),
                    ),
                );

            return { ok: true as const };
        });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        return res.json({ message: "Entry withdrawn" });
    } catch (err) {
        next(err);
    }
};
