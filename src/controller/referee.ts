import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import { and, eq, inArray } from "drizzle-orm";
import db from "../config/db.js";
import { races } from "../schema/races.js";
import { raceResults } from "../schema/raceResults.js";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { raceEntries } from "../schema/raceEntries.js";
import { violations } from "../schema/violations.js";
import { violationTypeConfig } from "../schema/violationTypeConfig.js";
import { refereeAssignments } from "../schema/refereeAssignments.js";
import { horses } from "../schema/horses.js";
import { users } from "../schema/users.js";
import { jockeyProfile } from "../schema/jockeyProfile.js";
import { courseDistances } from "../schema/courseDistances.js";
import { raceCourses } from "../schema/raceCourses.js";
import { tournaments as tournamentsTable } from "../schema/tournament.js";
import { jockeyProfile } from "../schema/jockeyProfile.js";
import { eventBus } from "../websocket/eventBus.js";
import { resolvePredictions } from "../utils/resolvePredictions.js";

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
                distanceMeters: courseDistances.distanceMeters,
                trackCondition: raceCourses.surfaceType,
                scheduledAt: races.scheduleAt,
                venue: raceCourses.name,
                status: races.status,
            })
            .from(races)
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(eq(races.id, raceId));

        if (!race) {
            return res.status(404).json({ message: "Race not found" });
        }

        await ensureReportInitialized(raceId);

        const [reportResult, referees, placements, violationRows] =
            await Promise.all([
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
                    .innerJoin(
                        users,
                        eq(refereeAssignments.refereeId, users.id),
                    )
                    .where(eq(refereeAssignments.raceId, raceId)),
                db
                    .select({
                        entryId: raceResultEntries.entryId,
                        laneNumber: raceEntries.laneNumber,
                        horse: {
                            id: horses.id,
                            name: horses.name,
                            breed: horses.breed,
                            baseSpeed: horses.baseSpeed,
                            stamina: horses.stamina,
                        },
                        jockey: {
                            id: users.id,
                            fullName: users.fullName,
                        },
                        finishedPosition: raceResultEntries.finishedPosition,
                        finishTime: raceResultEntries.finishTime,
                        finishStatus: raceResultEntries.finishStatus,
                        points: raceResultEntries.points,
                    })
                    .from(raceResultEntries)
                    .innerJoin(
                        raceEntries,
                        eq(raceResultEntries.entryId, raceEntries.id),
                    )
                    .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                    .leftJoin(users, eq(raceEntries.jockeyId, users.id))
                    .where(eq(raceResultEntries.raceId, raceId))
                    .orderBy(raceResultEntries.finishedPosition),
                db
                    .select({
                        entryId: violations.entryId,
                        id: violations.id,
                        violationTypeConfigId: violations.violationTypeConfigId,
                        violationType: violationTypeConfig.violationType,
                        severity: violations.severity,
                        note: violations.note,
                        occurredAt: violations.occurredAt,
                        refereeId: violations.refereeId,
                    })
                    .from(violations)
                    .innerJoin(
                        violationTypeConfig,
                        eq(
                            violations.violationTypeConfigId,
                            violationTypeConfig.id,
                        ),
                    )
                    .innerJoin(
                        raceEntries,
                        eq(violations.entryId, raceEntries.id),
                    )
                    .where(eq(raceEntries.raceId, raceId)),
            ]);

        type ViolationRow = (typeof violationRows)[0];
        const violationMap = new Map<string, ViolationRow[]>();
        for (const v of violationRows) {
            const list = violationMap.get(v.entryId);
            if (list) {
                list.push(v);
            } else {
                violationMap.set(v.entryId, [v]);
            }
        }

        const placementsWithViolations = placements.map((p) => ({
            ...p,
            violations: violationMap.get(p.entryId) ?? [],
        }));

        res.json({
            race,
            referees,
            report: reportResult,
            placements: placementsWithViolations,
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
                        basePoints: p.points,
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

        const { entryId, occurredAt, violationTypeConfigId, severity, note } =
            req.body;

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
            const [current] = await tx
                .select({
                    basePoints: raceResultEntries.basePoints,
                    points: raceResultEntries.points,
                    finishStatus: raceResultEntries.finishStatus,
                })
                .from(raceResultEntries)
                .where(
                    and(
                        eq(raceResultEntries.raceId, raceId),
                        eq(raceResultEntries.entryId, entryId),
                    ),
                )
                .for("update");

            if (!current) {
                throw new Error("Entry result not found");
            }

            const isZeroing =
                severity === "disqualification" ||
                severity === "result_cancellation";

            let pointsDeducted: number | null = null;

            if (severity === "point_deduction") {
                const [config] = await tx
                    .select({
                        amount: violationTypeConfig.pointsDeducted,
                    })
                    .from(violationTypeConfig)
                    .where(eq(violationTypeConfig.id, violationTypeConfigId));

                pointsDeducted = config?.amount ?? 0;
            } else if (isZeroing) {
                pointsDeducted = current.points;
            }

            const [v] = await tx
                .insert(violations)
                .values({
                    entryId,
                    refereeId: req.user!.id,
                    occurredAt: new Date(occurredAt),
                    violationTypeConfigId,
                    severity,
                    note: note ?? null,
                    pointsDeducted,
                    previousFinishStatus:
                        severity === "disqualification"
                            ? current.finishStatus
                            : null,
                })
                .returning();

            if (!v) {
                throw new Error("Failed to create violation");
            }

            const updateFields: Record<string, unknown> = {};

            if (isZeroing) {
                updateFields.points = 0;
                if (severity === "disqualification") {
                    updateFields.finishStatus = "dsq";
                }
            } else if (severity === "point_deduction") {
                const allViolations = await tx
                    .select({
                        severity: violations.severity,
                        pointsDeducted: violations.pointsDeducted,
                    })
                    .from(violations)
                    .where(eq(violations.entryId, entryId));

                const hasZeroing = allViolations.some(
                    (v) =>
                        v.severity === "disqualification" ||
                        v.severity === "result_cancellation",
                );

                if (hasZeroing) {
                    updateFields.points = 0;
                } else {
                    const totalPointsDeducted = allViolations
                        .filter((v) => v.severity === "point_deduction")
                        .reduce(
                            (sum, row) => sum + (row.pointsDeducted ?? 0),
                            0,
                        );

                    const base = current.basePoints ?? current.points;
                    updateFields.points = Math.max(
                        0,
                        base - totalPointsDeducted,
                    );
                }
            }

            if (Object.keys(updateFields).length > 0) {
                await tx
                    .update(raceResultEntries)
                    .set(updateFields)
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
                entryId: violations.entryId,
                severity: violations.severity,
                previousFinishStatus: violations.previousFinishStatus,
                pointsDeducted: violations.pointsDeducted,
            })
            .from(violations)
            .innerJoin(raceEntries, eq(violations.entryId, raceEntries.id))
            .where(
                and(
                    eq(violations.id, violationId),
                    eq(raceEntries.raceId, raceId),
                ),
            );

        if (!violation) {
            return res.status(404).json({ message: "Violation not found" });
        }

        await db.transaction(async (tx) => {
            const [current] = await tx
                .select({
                    basePoints: raceResultEntries.basePoints,
                    points: raceResultEntries.points,
                    finishStatus: raceResultEntries.finishStatus,
                })
                .from(raceResultEntries)
                .where(
                    and(
                        eq(raceResultEntries.raceId, raceId),
                        eq(raceResultEntries.entryId, violation.entryId),
                    ),
                )
                .for("update");

            if (!current) {
                throw new Error("Entry result not found");
            }

            await tx.delete(violations).where(eq(violations.id, violationId));

            const remaining = await tx
                .select({
                    severity: violations.severity,
                    pointsDeducted: violations.pointsDeducted,
                    previousFinishStatus: violations.previousFinishStatus,
                })
                .from(violations)
                .where(eq(violations.entryId, violation.entryId));

            const hasZeroing = remaining.some(
                (r) =>
                    r.severity === "disqualification" ||
                    r.severity === "result_cancellation",
            );

            const updateFields: Record<string, unknown> = {};

            if (hasZeroing) {
                updateFields.points = 0;
            } else {
                const deductionSum = remaining
                    .filter((r) => r.severity === "point_deduction")
                    .reduce((sum, r) => sum + (r.pointsDeducted ?? 0), 0);

                const base = current.basePoints ?? current.points;
                updateFields.points = Math.max(0, base - deductionSum);
            }

            const hasDsq = remaining.some(
                (r) => r.severity === "disqualification",
            );

            if (violation.severity === "disqualification" && !hasDsq) {
                updateFields.finishStatus =
                    violation.previousFinishStatus ?? "finished";
            }

            if (Object.keys(updateFields).length > 0) {
                await tx
                    .update(raceResultEntries)
                    .set(updateFields)
                    .where(
                        and(
                            eq(raceResultEntries.raceId, raceId),
                            eq(raceResultEntries.entryId, violation.entryId),
                        ),
                    );
            }
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

        const [race] = await db
            .select({ status: races.status })
            .from(races)
            .where(eq(races.id, raceId));

        await db.transaction(async (tx) => {
            await tx
                .update(raceResults)
                .set({
                    resultStatus: "published",
                    refereeConfirmedBy: req.user!.id,
                    refereeConfirmedAt: new Date(),
                    publishedBy: req.user!.id,
                    publishedAt: new Date(),
                    notes: notes ?? null,
                })
                .where(eq(raceResults.id, report.id));

            await tx
                .update(races)
                .set({ status: "completed" })
                .where(eq(races.id, raceId));

            await resolvePredictions(raceId, tx);
        });

        try {
            eventBus.emit({
                type: "race:status_changed",
                data: {
                    raceId,
                    status: "completed",
                    previousStatus: race?.status ?? "",
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (emitErr) {
            console.error(`Failed to emit race:status_changed ${emitErr}`);
        }

        res.json({ message: "Report submitted and race result published" });
    } catch (err) {
        next(err);
    }
};

export const getRefereeRaceEntries = async (
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
            return res.status(403).json({
                message:
                    "Unauthorized: You are not assigned to officiate this track event.",
            });
        }

        const entries = await db
            .select({
                id: raceEntries.id,
                laneNumber: raceEntries.laneNumber,
                entryStatus: raceEntries.entryStatus,
                horse: {
                    id: horses.id,
                    name: horses.name,
                    breed: horses.breed,
                    weightKg: horses.weightKg,
                    baseSpeed: horses.baseSpeed,
                    stamina: horses.stamina,
                },
                jockey: {
                    id: users.id,
                    fullName: users.fullName,
                    weightKg: jockeyProfile.weightKg,
                },
            })
            .from(raceEntries)
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .leftJoin(users, eq(raceEntries.jockeyId, users.id))
            .innerJoin(jockeyProfile, eq(users.id, jockeyProfile.userId))
            .where(eq(raceEntries.raceId, raceId))
            .orderBy(raceEntries.laneNumber);

        res.json({ entries });
    } catch (err) {
        next(err);
    }
};

// UC-RR-01: referee marks a horse entry Cleared, Disqualified, or Withdrawn.
export const inspectEntry = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        const entryId = req.params.entryId as string;
        if (!uuidValidate(raceId) || !uuidValidate(entryId)) {
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
            return res.status(403).json({
                message:
                    "Unauthorized: You are not assigned to officiate this track event.",
            });
        }

        const { result, healthStatus } = req.body as {
            result: "cleared" | "disqualified" | "withdrawn";
            healthStatus?: "healthy" | "injured" | "sick" | "rest";
        };
        const entryStatus = result === "cleared" ? "confirmed" : result;

        const outcome = await db.transaction(async (tx) => {
            const [race] = await tx
                .select({
                    status: races.status,
                    tournamentId: races.tournamentId,
                })
                .from(races)
                .where(eq(races.id, raceId))
                .for("update");

            if (!race) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Race not found",
                };
            }
            if (race.status !== "pre_race") {
                return {
                    ok: false as const,
                    status: 409,
                    message:
                        "Cannot alter inspection status once the race is already started or completed.",
                };
            }

            if (entryStatus === "confirmed" && healthStatus) {
                if (healthStatus !== "healthy") {
                    return {
                        ok: false as const,
                        status: 409,
                        message: "Horse is not fit to race",
                    };
                }
            }

            if (entryStatus === "confirmed") {
                const [tournament] = await tx
                    .select({ carryWeight: tournamentsTable.carryWeight })
                    .from(tournamentsTable)
                    .where(eq(tournamentsTable.id, race.tournamentId));

                if (tournament?.carryWeight) {
                    const [entry] = await tx
                        .select({ jockeyId: raceEntries.jockeyId })
                        .from(raceEntries)
                        .where(
                            and(
                                eq(raceEntries.id, entryId),
                                eq(raceEntries.raceId, raceId),
                            ),
                        );

                    if (entry?.jockeyId) {
                        const [jockey] = await tx
                            .select({ weightKg: jockeyProfile.weightKg })
                            .from(jockeyProfile)
                            .where(eq(jockeyProfile.userId, entry.jockeyId));

                        if (
                            jockey?.weightKg &&
                            Number(jockey.weightKg) >
                                Number(tournament.carryWeight)
                        ) {
                            return {
                                ok: false as const,
                                status: 409,
                                message: "Jockey exceeds carry weight limit",
                            };
                        }
                    }
                }
            }

            const [updatedRow] = await tx
                .update(raceEntries)
                .set({ entryStatus })
                .where(
                    and(
                        eq(raceEntries.id, entryId),
                        eq(raceEntries.raceId, raceId),
                    ),
                )
                .returning({
                    id: raceEntries.id,
                    horseId: raceEntries.horseId,
                });

            if (!updatedRow) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Entry not found in this race",
                };
            }

            if (healthStatus && updatedRow.horseId) {
                await tx
                    .update(horses)
                    .set({ healthStatus })
                    .where(eq(horses.id, updatedRow.horseId));
            }

            return { ok: true as const };
        });

        if (!outcome.ok) {
            return res
                .status(outcome.status)
                .json({ message: outcome.message });
        }

        const [updated] = await db
            .select({
                id: raceEntries.id,
                laneNumber: raceEntries.laneNumber,
                entryStatus: raceEntries.entryStatus,
                horse: {
                    id: horses.id,
                    name: horses.name,
                    breed: horses.breed,
                    weightKg: horses.weightKg,
                    baseSpeed: horses.baseSpeed,
                    stamina: horses.stamina,
                },
                jockey: {
                    id: users.id,
                    fullName: users.fullName,
                    weightKg: jockeyProfile.weightKg,
                },
            })
            .from(raceEntries)
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .leftJoin(users, eq(raceEntries.jockeyId, users.id))
            .leftJoin(jockeyProfile, eq(jockeyProfile.userId, users.id))
            .where(eq(raceEntries.id, entryId));

        res.json({ entry: updated });
    } catch (err) {
        next(err);
    }
};
