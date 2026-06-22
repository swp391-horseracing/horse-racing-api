import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import { and, eq, inArray } from "drizzle-orm";
import db from "../config/db.js";
import { races } from "../schema/races.js";
import { raceResults } from "../schema/raceResults.js";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { raceEntries } from "../schema/raceEntries.js";
import { violations } from "../schema/violations.js";
import { refereeAssignments } from "../schema/refereeAssignments.js";
import { horses } from "../schema/horses.js";
import { users } from "../schema/users.js";

async function ensureReportInitialized(raceId: string) {
    await db.transaction(async (tx) => {
        const [race] = await tx
            .select({ id: races.id })
            .from(races)
            .where(eq(races.id, raceId))
            .for("update");

        if (!race) throw new Error("Race not found");

        const [existing] = await tx
            .select({ id: raceResults.id })
            .from(raceResults)
            .where(eq(raceResults.raceId, raceId));

        if (existing) return;

        const [result] = await tx
            .insert(raceResults)
            .values({ raceId })
            .returning();

        if (!result) throw new Error("Failed to initialize report");

        const entries = await tx
            .select({ id: raceEntries.id })
            .from(raceEntries)
            .where(
                and(
                    eq(raceEntries.raceId, raceId),
                    eq(raceEntries.entryStatus, "confirmed"),
                ),
            );

        if (entries.length > 0) {
            await tx.insert(raceResultEntries).values(
                entries.map((e) => ({
                    raceId,
                    resultId: result.id,
                    entryId: e.id,
                })),
            );
        }
    });
}

export const getRefereeRaceReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [assignment] = await db
            .select({ id: refereeAssignments.id })
            .from(refereeAssignments)
            .where(
                and(
                    eq(refereeAssignments.raceId, raceId),
                    eq(refereeAssignments.refereeId, req.user!.id),
                ),
            );

        if (!assignment) {
            return res
                .status(403)
                .json({ message: "You are not assigned to this race" });
        }

        const [race] = await db
            .select({
                id: races.id,
                name: races.name,
                raceNumber: races.raceNumber,
                distanceMeters: races.distanceMeters,
                trackCondition: races.trackCondition,
                scheduledAt: races.scheduleAt,
                venue: races.venue,
                status: races.status,
            })
            .from(races)
            .where(eq(races.id, raceId));

        if (!race) {
            return res.status(404).json({ message: "Race not found" });
        }

        await ensureReportInitialized(raceId);

        const [reportResult, referees, placements] = await Promise.all([
            db
                .select({
                    id: raceResults.id,
                    status: raceResults.resultStatus,
                    notes: raceResults.notes,
                    refereeConfirmedBy: raceResults.refereeConfirmedBy,
                    refereeConfirmedAt: raceResults.refereeConfirmedAt,
                    publishedBy: raceResults.publishedBy,
                    publishedAt: raceResults.publishedAt,
                    createdAt: raceResults.createdAt,
                    updatedAt: raceResults.updatedAt,
                })
                .from(raceResults)
                .where(eq(raceResults.raceId, raceId))
                .then((rows) => rows[0] ?? null),
            db
                .select({
                    id: users.id,
                    fullName: users.fullName,
                })
                .from(refereeAssignments)
                .innerJoin(users, eq(refereeAssignments.refereeId, users.id))
                .where(eq(refereeAssignments.raceId, raceId)),
            db
                .select({
                    entryId: raceResultEntries.entryId,
                    laneNumber: raceEntries.laneNumber,
                    horse: {
                        id: horses.id,
                        name: horses.name,
                        breed: horses.breed,
                    },
                    jockey: {
                        id: users.id,
                        fullName: users.fullName,
                    },
                    finishedPosition: raceResultEntries.finishedPosition,
                    finishTime: raceResultEntries.finishTime,
                    finishStatus: raceResultEntries.finishStatus,
                    points: raceResultEntries.points,
                    violation: {
                        id: violations.id,
                        violationType: violations.violationType,
                        description: violations.description,
                        severity: violations.severity,
                        note: violations.note,
                        occurredAt: violations.occurredAt,
                        refereeId: violations.refereeId,
                    },
                })
                .from(raceResultEntries)
                .innerJoin(
                    raceEntries,
                    eq(raceResultEntries.entryId, raceEntries.id),
                )
                .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                .leftJoin(users, eq(raceEntries.jockeyId, users.id))
                .leftJoin(
                    violations,
                    eq(raceResultEntries.violationId, violations.id),
                )
                .where(eq(raceResultEntries.raceId, raceId))
                .orderBy(raceResultEntries.finishedPosition),
        ]);

        res.json({
            race,
            referees,
            report: reportResult,
            placements,
        });
    } catch (err) {
        next(err);
    }
};

export const updatePlacements = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [assignment] = await db
            .select({ id: refereeAssignments.id })
            .from(refereeAssignments)
            .where(
                and(
                    eq(refereeAssignments.raceId, raceId),
                    eq(refereeAssignments.refereeId, req.user!.id),
                ),
            );

        if (!assignment) {
            return res
                .status(403)
                .json({ message: "You are not assigned to this race" });
        }

        const [report] = await db
            .select({ status: raceResults.resultStatus })
            .from(raceResults)
            .where(eq(raceResults.raceId, raceId));

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }
        if (report.status !== "draft") {
            return res.status(409).json({
                message: "Report is not in draft status",
            });
        }

        const { placements } = req.body;

        const entryIds = placements.map((p: { entryId: string }) => p.entryId);

        const existingEntries = await db
            .select({ entryId: raceResultEntries.entryId })
            .from(raceResultEntries)
            .where(
                and(
                    eq(raceResultEntries.raceId, raceId),
                    inArray(raceResultEntries.entryId, entryIds),
                ),
            );

        const existingIds = new Set(existingEntries.map((e) => e.entryId));
        const missing = entryIds.filter((id: string) => !existingIds.has(id));
        if (missing.length > 0) {
            return res.status(400).json({
                message: "Invalid entryIds not found in this race",
                invalidIds: missing,
            });
        }

        await db.transaction(async (tx) => {
            await tx
                .update(raceResultEntries)
                .set({ finishedPosition: null })
                .where(eq(raceResultEntries.raceId, raceId));

            for (const p of placements) {
                await tx
                    .update(raceResultEntries)
                    .set({
                        finishedPosition: p.finishedPosition,
                        finishTime: p.finishTime ?? null,
                        finishStatus: p.finishStatus,
                        points: p.points,
                    })
                    .where(
                        and(
                            eq(raceResultEntries.raceId, raceId),
                            eq(raceResultEntries.entryId, p.entryId),
                        ),
                    );
            }
        });

        res.json({ message: "Placements updated" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err?.cause?.code === "23505") {
            return res.status(409).json({
                message: "Duplicate finishedPosition values",
            });
        }
        next(err);
    }
};

export const createViolation = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [assignment] = await db
            .select({ id: refereeAssignments.id })
            .from(refereeAssignments)
            .where(
                and(
                    eq(refereeAssignments.raceId, raceId),
                    eq(refereeAssignments.refereeId, req.user!.id),
                ),
            );

        if (!assignment) {
            return res
                .status(403)
                .json({ message: "You are not assigned to this race" });
        }

        const [report] = await db
            .select({ status: raceResults.resultStatus })
            .from(raceResults)
            .where(eq(raceResults.raceId, raceId));

        if (!report || report.status !== "draft") {
            return res.status(409).json({
                message: "Report is not in draft status",
            });
        }

        const {
            entryId,
            occurredAt,
            violationType,
            description,
            severity,
            note,
        } = req.body;

        const [entry] = await db
            .select({ id: raceEntries.id })
            .from(raceEntries)
            .where(
                and(
                    eq(raceEntries.id, entryId),
                    eq(raceEntries.raceId, raceId),
                ),
            );

        if (!entry) {
            return res.status(404).json({
                message: "Entry not found in this race",
            });
        }

        const [violation] = await db.transaction(async (tx) => {
            const [v] = await tx
                .insert(violations)
                .values({
                    entryId,
                    refereeId: req.user!.id,
                    occurredAt: new Date(occurredAt),
                    violationType,
                    description,
                    severity,
                    note: note ?? null,
                })
                .returning();

            if (!v) {
                throw new Error("Failed to create violation");
            }

            if (severity === "disqualification") {
                const [current] = await tx
                    .select({ finishStatus: raceResultEntries.finishStatus })
                    .from(raceResultEntries)
                    .where(
                        and(
                            eq(raceResultEntries.raceId, raceId),
                            eq(raceResultEntries.entryId, entryId),
                        ),
                    )
                    .for("update");

                await tx
                    .update(raceResultEntries)
                    .set({
                        finishStatus: "dsq",
                        previousFinishStatus:
                            current?.finishStatus ?? "finished",
                        violationId: v.id,
                    })
                    .where(
                        and(
                            eq(raceResultEntries.raceId, raceId),
                            eq(raceResultEntries.entryId, entryId),
                        ),
                    );
            } else {
                await tx
                    .update(raceResultEntries)
                    .set({ violationId: v.id })
                    .where(
                        and(
                            eq(raceResultEntries.raceId, raceId),
                            eq(raceResultEntries.entryId, entryId),
                        ),
                    );
            }

            return [v];
        });

        res.status(201).json(violation);
    } catch (err) {
        next(err);
    }
};

export const deleteViolation = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        const violationId = req.params.violationId as string;
        if (!uuidValidate(raceId) || !uuidValidate(violationId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [assignment] = await db
            .select({ id: refereeAssignments.id })
            .from(refereeAssignments)
            .where(
                and(
                    eq(refereeAssignments.raceId, raceId),
                    eq(refereeAssignments.refereeId, req.user!.id),
                ),
            );

        if (!assignment) {
            return res
                .status(403)
                .json({ message: "You are not assigned to this race" });
        }

        const [report] = await db
            .select({ status: raceResults.resultStatus })
            .from(raceResults)
            .where(eq(raceResults.raceId, raceId));

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }
        if (report.status !== "draft") {
            return res.status(409).json({
                message: "Report is not in draft status",
            });
        }

        const [violation] = await db
            .select({
                id: violations.id,
                severity: violations.severity,
                previousFinishStatus: raceResultEntries.previousFinishStatus,
            })
            .from(violations)
            .innerJoin(
                raceResultEntries,
                eq(raceResultEntries.violationId, violations.id),
            )
            .where(
                and(
                    eq(violations.id, violationId),
                    eq(raceResultEntries.raceId, raceId),
                ),
            );

        if (!violation) {
            return res.status(404).json({ message: "Violation not found" });
        }

        await db.transaction(async (tx) => {
            await tx
                .update(raceResultEntries)
                .set(
                    violation.severity === "disqualification"
                        ? {
                              violationId: null,
                              finishStatus:
                                  violation.previousFinishStatus ?? "finished",
                              previousFinishStatus: null,
                          }
                        : { violationId: null },
                )
                .where(
                    and(
                        eq(raceResultEntries.raceId, raceId),
                        eq(raceResultEntries.violationId, violationId),
                    ),
                );

            await tx.delete(violations).where(eq(violations.id, violationId));
        });

        res.json({ message: "Violation removed" });
    } catch (err) {
        next(err);
    }
};

export const submitReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [assignment] = await db
            .select({ id: refereeAssignments.id })
            .from(refereeAssignments)
            .where(
                and(
                    eq(refereeAssignments.raceId, raceId),
                    eq(refereeAssignments.refereeId, req.user!.id),
                ),
            );

        if (!assignment) {
            return res
                .status(403)
                .json({ message: "You are not assigned to this race" });
        }

        const [report] = await db
            .select({ id: raceResults.id, status: raceResults.resultStatus })
            .from(raceResults)
            .where(eq(raceResults.raceId, raceId));

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }
        if (report.status !== "draft") {
            return res.status(409).json({
                message: "Report is not in draft status",
            });
        }

        const { notes } = req.body;

        const [updated] = await db
            .update(raceResults)
            .set({
                resultStatus: "referee_confirmed",
                refereeConfirmedBy: req.user!.id,
                refereeConfirmedAt: new Date(),
                notes: notes ?? null,
            })
            .where(eq(raceResults.id, report.id))
            .returning();

        res.json({ message: "Report submitted", report: updated });
    } catch (err) {
        next(err);
    }
};
