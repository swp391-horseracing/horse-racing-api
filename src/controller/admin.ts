import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import {
    registrationsQuerySchema,
    tournamentReadinessSchema,
    usersQuerySchema,
} from "../validator/admin.js";
import { users } from "../schema/users.js";
import {
    and,
    desc,
    eq,
    ExtractTablesWithRelations,
    ilike,
    inArray,
    isNotNull,
    isNull,
    sql,
} from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import db from "../config/db.js";
import { tournaments } from "../schema/tournament.js";
import { races } from "../schema/races.js";
import { predictions } from "../schema/predictions.js";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { raceEntries } from "../schema/raceEntries.js";
import { raceResults } from "../schema/raceResults.js";
import { refereeAssignments } from "../schema/refereeAssignments.js";
import { violations } from "../schema/violations.js";
import { horses } from "../schema/horses.js";
import { courseDistances } from "../schema/courseDistances.js";
import { raceCourses } from "../schema/raceCourses.js";
import { reportsQuerySchema } from "../validator/report.js";
import { eventBus } from "../websocket/eventBus.js";
import { tournamentRegistrations } from "../schema/tournamentRegistrations.js";

export const getUsers = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const parsed = usersQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }
        const { role, status, search, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions = and(
            search ? ilike(users.fullName, `%${search}%`) : undefined,
            role ? eq(users.role, role) : undefined,
            status ? eq(users.status, status) : undefined,
        );

        const [data, count] = await Promise.all([
            db
                .select({
                    id: users.id,
                    fullName: users.fullName,
                    email: users.email,
                    role: users.role,
                    status: users.status,
                    createdAt: users.createdAt,
                    avatarUrl: users.avatar_url,
                })
                .from(users)
                .where(conditions)
                .orderBy(desc(users.createdAt), desc(users.id))
                .limit(l)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)` })
                .from(users)
                .where(conditions),
        ]);

        return res.json(
            paginatedResponse(data, Number(count[0]?.count ?? 0), p, l),
        );
    } catch (err) {
        next(err);
    }
};

export const getUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.params.userId as string;
        if (!uuidValidate(userId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [user] = await db
            .select({
                id: users.id,
                fullName: users.fullName,
                email: users.email,
                phone: users.phone,
                address: users.address,
                avatarUrl: users.avatar_url,
                role: users.role,
                status: users.status,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .where(eq(users.id, userId));

        if (!user) {
            return res.status(404).json({ message: "User not exist" });
        }

        res.json(user);
    } catch (err) {
        next(err);
    }
};

export const updateUserRole = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.params.userId as string;
        const currUser = req.user;
        const role = req.body.role;

        if (!uuidValidate(userId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        if (currUser?.id === userId) {
            return res
                .status(403)
                .json({ message: "Cannot change your own role" });
        }

        const [userRole] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, userId));

        if (role == userRole?.role) {
            return res
                .status(403)
                .json({ message: "Role already set to this user" });
        }

        const updatedUser = await db
            .update(users)
            .set({ role: role })
            .where(eq(users.id, userId))
            .returning();

        if (updatedUser.length === 0) {
            return res.status(404).json({ message: "User not exist" });
        }

        res.json({ message: "Role updated", userId: updatedUser[0]?.id });
    } catch (err) {
        next(err);
    }
};

export const updateUserStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
        pending: ["active", "locked"],
        active: ["locked"],
        locked: ["active"],
    };
    try {
        const userId = req.params.userId as string;
        const status = req.body.status;

        if (!uuidValidate(userId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [user] = await db
            .select({ id: users.id, status: users.status })
            .from(users)
            .where(eq(users.id, userId));

        if (!user) {
            return res.status(404).json({ message: "User not exist" });
        }

        const allowed = ALLOWED_TRANSITIONS[user.status] ?? [];
        if (!allowed.includes(status)) {
            return res.status(403).json({
                message: `Cannot transition from '${user.status}' to '${status}'`,
            });
        }

        const [updatedUser] = await db
            .update(users)
            .set({ status: status })
            .where(eq(users.id, userId))
            .returning();

        res.json({ message: "Updated user status", userId: updatedUser?.id });
    } catch (err) {
        next(err);
    }
};

export const createTournament = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const admin = req.user!;
        const {
            name,
            startDate,
            endDate,
            description,
            rules,
            location,
            registrationOpenDate,
            registrationCloseDate,
            maximumParticipants,
            minimumParticipants,
            prizePool,
        } = req.body;

        const [newTournament] = await db
            .insert(tournaments)
            .values({
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                createdBy: admin?.id,
                description: description ?? null,
                rules: rules ?? null,
                location: location ?? null,
                registrationOpenDate: registrationOpenDate ?? null,
                registrationCloseDate: registrationCloseDate ?? null,
                maximumParticipants: maximumParticipants ?? null,
                minimumParticipants: minimumParticipants ?? null,
                prizePool: prizePool ?? null,
            })
            .returning();

        res.json(newTournament);
    } catch (err) {
        next(err);
    }
};

export const updateTournament = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const tournamentId = req.params.tournamentId as string;
        if (!uuidValidate(tournamentId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const body = req.body;

        const result = await db.transaction(async (tx) => {
            const [tournamentStatus] = await tx
                .select({ status: tournaments.status })
                .from(tournaments)
                .where(eq(tournaments.id, tournamentId))
                .for("update");

            if (!tournamentStatus) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Tournament not found",
                };
            }

            if (tournamentStatus.status === "ongoing") {
                return {
                    ok: false as const,
                    status: 403,
                    message: "Cannot update a ongoing tournament",
                };
            }

            const [updatedTournament] = await tx
                .update(tournaments)
                .set({ ...body, updatedAt: new Date() })
                .where(eq(tournaments.id, tournamentId))
                .returning();

            return { ok: true as const, tournament: updatedTournament };
        });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        res.json(result.tournament);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err?.cause?.code === "23514") {
            return res.status(400).json({
                message: "Failed validation constaint",
                constraint: err.cause.constraint,
            });
        }
        next(err);
    }
};

export const updateTournamentStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const ALLOWED_TRANSITIONS: Record<string, string[]> = {
            draft: ["upcoming"],
            upcoming: ["registration_open", "cancelled"],
            registration_open: ["registration_closed", "cancelled"],
            registration_closed: ["ongoing", "cancelled"],
            ongoing: ["completed", "cancelled"],
        };
        const tournamentId = req.params.tournamentId as string;
        if (!uuidValidate(tournamentId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const status = req.body.status;

        const [tournament] = await db
            .select()
            .from(tournaments)
            .where(eq(tournaments.id, tournamentId));

        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        if (status === "upcoming") {
            const validation = tournamentReadinessSchema.safeParse(tournament);
            if (!validation.success) {
                const missing = validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                }));
                return res.status(400).json({
                    message: "Tournament is missing required field",
                    fields: missing,
                });
            }
        }
        const allowed = ALLOWED_TRANSITIONS[tournament.status] ?? [];
        if (!allowed.includes(status)) {
            return res.status(403).json({
                message: `Cannot transition from '${tournament.status}' to '${status}'`,
            });
        }
        const [updatedTournament] = await db
            .update(tournaments)
            .set({ status: status })
            .where(
                and(
                    eq(tournaments.id, tournamentId),
                    eq(tournaments.status, tournament.status),
                ),
            )
            .returning();
        if (!updatedTournament) {
            return res.status(409).json({
                message:
                    "Tournament status changed concurrently. Please retry.",
            });
        }

        res.json(updatedTournament);
    } catch (err) {
        next(err);
    }
};

export const createTournamentRace = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const tournamentId = req.params.tournamentId as string;
        if (!uuidValidate(tournamentId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [tournament] = await db
            .select({
                id: tournaments.id,
                startDate: tournaments.startDate,
                endDate: tournaments.endDate,
            })
            .from(tournaments)
            .where(eq(tournaments.id, tournamentId));

        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        const { courseDistanceId } = req.body;

        const [distance] = await db
            .select({
                id: courseDistances.id,
                courseId: courseDistances.courseId,
            })
            .from(courseDistances)
            .where(eq(courseDistances.id, courseDistanceId));

        if (!distance) {
            return res.status(400).json({ message: "Course distance not found" });
        }

        const [course] = await db
            .select({ status: raceCourses.status })
            .from(raceCourses)
            .where(eq(raceCourses.id, distance.courseId));

        if (!course || course.status !== "active") {
            return res.status(400).json({
                message: "Cannot create race — course is not active",
            });
        }

        if (req.body.scheduleAt) {
            if (
                req.body.scheduleAt < tournament.startDate ||
                req.body.scheduleAt > tournament.endDate
            ) {
                return res.status(400).json({
                    message:
                        "scheduleAt must be between tournament start and end dates",
                });
            }
        }

        const [newRace] = await db
            .insert(races)
            .values({ ...req.body, tournamentId })
            .returning();

        res.status(201).json(newRace);
    } catch (err) {
        next(err);
    }
};

export const updateRace = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const result = await db.transaction(async (tx) => {
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

            if (race.status === "ongoing") {
                return {
                    ok: false as const,
                    status: 403,
                    message: "Cannot update a ongoing race",
                };
            }

            if (req.body.courseDistanceId) {
                const [distance] = await tx
                    .select({
                        id: courseDistances.id,
                        courseId: courseDistances.courseId,
                    })
                    .from(courseDistances)
                    .where(eq(courseDistances.id, req.body.courseDistanceId));

                if (!distance) {
                    return {
                        ok: false as const,
                        status: 400,
                        message: "Course distance not found",
                    };
                }

                const [course] = await tx
                    .select({ status: raceCourses.status })
                    .from(raceCourses)
                    .where(eq(raceCourses.id, distance.courseId));

                if (!course || course.status !== "active") {
                    return {
                        ok: false as const,
                        status: 400,
                        message: "Cannot update race — course is not active",
                    };
                }
            }

            if (req.body.scheduleAt) {
                const [tournament] = await tx
                    .select({
                        startDate: tournaments.startDate,
                        endDate: tournaments.endDate,
                    })
                    .from(tournaments)
                    .where(eq(tournaments.id, race.tournamentId));

                if (
                    tournament &&
                    (req.body.scheduleAt < tournament.startDate ||
                        req.body.scheduleAt > tournament.endDate)
                ) {
                    return {
                        ok: false as const,
                        status: 400,
                        message:
                            "scheduleAt must be between tournament start and end dates",
                    };
                }
            }

            const [updatedRace] = await tx
                .update(races)
                .set({ ...req.body, updatedAt: new Date() })
                .where(eq(races.id, raceId))
                .returning();

            return { ok: true as const, race: updatedRace };
        });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        res.json(result.race);
    } catch (err) {
        next(err);
    }
};

async function resolvePredictions(
    raceId: string,
    tx: PgTransaction<
        NodePgQueryResultHKT,
        Record<string, never>,
        ExtractTablesWithRelations<Record<string, never>>
    >,
) {
    const results = await tx
        .select({
            entryId: raceResultEntries.entryId,
            position: raceResultEntries.finishedPosition,
        })
        .from(raceResultEntries)
        .where(
            and(
                eq(raceResultEntries.raceId, raceId),
                isNotNull(raceResultEntries.finishedPosition),
            ),
        );

    const resultMap = new Map(results.map((r) => [r.entryId, r.position]));

    const pendingPredictions = await tx
        .select({
            id: predictions.id,
            predictedEntryId: predictions.predictedEntryId,
            predictedPosition: predictions.predictedPosition,
        })
        .from(predictions)
        .where(
            and(eq(predictions.raceId, raceId), isNull(predictions.isCorrect)),
        );

    const correctIds: string[] = [];
    const incorrectIds: string[] = [];

    for (const p of pendingPredictions) {
        const actualPosition = resultMap.get(p.predictedEntryId);
        if (actualPosition === p.predictedPosition) {
            correctIds.push(p.id);
        } else {
            incorrectIds.push(p.id);
        }
    }

    await Promise.all([
        correctIds.length > 0
            ? tx
                  .update(predictions)
                  .set({ isCorrect: true, rewardAmount: "100.00" })
                  .where(inArray(predictions.id, correctIds))
            : Promise.resolve(),
        incorrectIds.length > 0
            ? tx
                  .update(predictions)
                  .set({ isCorrect: false })
                  .where(inArray(predictions.id, incorrectIds))
            : Promise.resolve(),
    ]);
}

export const updateRaceStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const ALLOWED_TRANSITIONS: Record<string, string[]> = {
            draft: ["scheduled"],
            scheduled: ["pre_race", "postponed", "cancelled"],
            pre_race: ["ongoing", "postponed", "cancelled"],
            ongoing: ["under_review", "postponed", "cancelled"],
            under_review: [
                "result_confirmed",
                "ongoing",
                "postponed",
                "cancelled",
            ],
            result_confirmed: ["completed", "cancelled"],
            completed: [],
            postponed: ["scheduled", "ongoing", "under_review", "cancelled"],
        };

        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const status = req.body.status;

        const [race] = await db
            .select()
            .from(races)
            .where(eq(races.id, raceId));

        if (!race) {
            return res.status(404).json({ message: "Race not found" });
        }

        if (race.status === "draft" && status === "scheduled") {
            if (!race.scheduleAt) {
                return res.status(400).json({
                    message:
                        "scheduleAt is required to move from draft to scheduled",
                });
            }

            const [tournament] = await db
                .select({
                    startDate: tournaments.startDate,
                    endDate: tournaments.endDate,
                })
                .from(tournaments)
                .where(eq(tournaments.id, race.tournamentId));

            if (
                tournament &&
                (race.scheduleAt < tournament.startDate ||
                    race.scheduleAt > tournament.endDate)
            ) {
                return res.status(400).json({
                    message:
                        "scheduleAt must be between tournament start and end dates",
                });
            }
        }

        const allowed = ALLOWED_TRANSITIONS[race.status] ?? [];
        if (!allowed.includes(status)) {
            return res.status(403).json({
                message: `Cannot transition from '${race.status}' to '${status}'`,
            });
        }

        const [updatedRace] = await db
            .update(races)
            .set({ status })
            .where(and(eq(races.id, raceId), eq(races.status, race.status)))
            .returning();

        if (!updatedRace) {
            return res.status(409).json({
                message: "Race status changed concurrently. Please retry.",
            });
        }

        try {
            eventBus.emit({
                type: "race:status_changed",
                data: {
                    raceId,
                    status: updatedRace.status,
                    previousStatus: race.status,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (emitErr) {
            console.error(`Failed to emit race:status_changed ${emitErr}`);
        }

        res.json(updatedRace);
    } catch (err) {
        next(err);
    }
};

export const getRegistrations = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const parsed = registrationsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }
        const { status, tournamentId, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions = and(
            status ? eq(tournamentRegistrations.status, status) : undefined,
            tournamentId
                ? eq(tournamentRegistrations.tournamentId, tournamentId)
                : undefined,
        );

        const [registrations, count] = await Promise.all([
            db
                .select({
                    id: tournamentRegistrations.registrationId,
                    status: tournamentRegistrations.status,
                    submittedAt: tournamentRegistrations.submittedAt,
                    reviewedAt: tournamentRegistrations.reviewedAt,
                    rejectReason: tournamentRegistrations.rejectReason,
                    tournament: {
                        id: tournaments.id,
                        name: tournaments.name,
                        location: tournaments.location,
                        startDate: tournaments.startDate,
                        endDate: tournaments.endDate,
                        status: tournaments.status,
                    },
                    horse: {
                        id: horses.id,
                        name: horses.name,
                        breed: horses.breed,
                    },
                    owner: {
                        id: users.id,
                        fullName: users.fullName,
                        email: users.email,
                    },
                })
                .from(tournamentRegistrations)
                .innerJoin(
                    tournaments,
                    eq(tournamentRegistrations.tournamentId, tournaments.id),
                )
                .innerJoin(
                    horses,
                    eq(tournamentRegistrations.horseId, horses.id),
                )
                .innerJoin(users, eq(tournamentRegistrations.ownerId, users.id))
                .where(conditions)
                .orderBy(desc(tournamentRegistrations.submittedAt))
                .limit(l)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)` })
                .from(tournamentRegistrations)
                .where(conditions),
        ]);

        return res.json(
            paginatedResponse(
                registrations,
                Number(count[0]?.count ?? 0),
                p,
                l,
            ),
        );
    } catch (err) {
        next(err);
    }
};

export const getReports = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const parsed = reportsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { resultStatus, search, dateFrom, dateTo, page, limit } =
            parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions = and(
            resultStatus
                ? eq(raceResults.resultStatus, resultStatus)
                : inArray(raceResults.resultStatus, [
                      "referee_confirmed",
                      "published",
                  ]),
            search
                ? sql`(${races.name} ILIKE ${`%${search}%`} OR ${tournaments.name} ILIKE ${`%${search}%`} OR ${users.fullName} ILIKE ${`%${search}%`})`
                : undefined,
            dateFrom
                ? sql`${raceResults.refereeConfirmedAt} >= ${new Date(dateFrom)}`
                : undefined,
            dateTo
                ? sql`${raceResults.refereeConfirmedAt} <= ${new Date(dateTo)}`
                : undefined,
        );

        const [data, count] = await Promise.all([
            db
                .select({
                    raceId: races.id,
                    raceName: races.name,
                    raceStatus: races.status,
                    tournamentId: races.tournamentId,
                    tournamentName: tournaments.name,
                    reportId: raceResults.id,
                    reportStatus: raceResults.resultStatus,
                    refereeConfirmedBy: raceResults.refereeConfirmedBy,
                    refereeName: users.fullName,
                    refereeConfirmedAt: raceResults.refereeConfirmedAt,
                    publishedAt: raceResults.publishedAt,
                })
                .from(raceResults)
                .innerJoin(races, eq(raceResults.raceId, races.id))
                .leftJoin(tournaments, eq(races.tournamentId, tournaments.id))
                .leftJoin(users, eq(raceResults.refereeConfirmedBy, users.id))
                .where(conditions)
                .orderBy(desc(raceResults.updatedAt))
                .limit(l)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)` })
                .from(raceResults)
                .innerJoin(races, eq(raceResults.raceId, races.id))
                .leftJoin(tournaments, eq(races.tournamentId, tournaments.id))
                .leftJoin(users, eq(raceResults.refereeConfirmedBy, users.id))
                .where(conditions),
        ]);

        res.json(paginatedResponse(data, Number(count[0]?.count ?? 0), p, l));
    } catch (err) {
        next(err);
    }
};

export const updateRegistrationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const ALLOWED_TRANSITIONS: Record<string, string[]> = {
            pending: ["approved", "rejected"],
        };

        const registrationId = req.params.id as string;
        if (!uuidValidate(registrationId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const admin = req.user!;
        const { status, rejectReason } = req.body;

        const [registration] = await db
            .select({ status: tournamentRegistrations.status })
            .from(tournamentRegistrations)
            .where(eq(tournamentRegistrations.registrationId, registrationId));

        if (!registration) {
            return res.status(404).json({ message: "Registration not found" });
        }

        const allowed = ALLOWED_TRANSITIONS[registration.status] ?? [];
        if (!allowed.includes(status)) {
            return res.status(403).json({
                message: `Cannot transition from '${registration.status}' to '${status}'`,
            });
        }

        const [updatedRegistration] = await db
            .update(tournamentRegistrations)
            .set({
                status,
                reviewedBy: admin.id,
                reviewedAt: new Date(),
                rejectReason: status === "rejected" ? rejectReason : null,
            })
            .where(
                and(
                    eq(tournamentRegistrations.registrationId, registrationId),
                    eq(tournamentRegistrations.status, registration.status),
                ),
            )
            .returning();

        if (!updatedRegistration) {
            return res.status(409).json({
                message:
                    "Registration status changed concurrently. Please retry.",
            });
        }

        res.json(updatedRegistration);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err?.cause?.code === "23514") {
            return res.status(400).json({
                message: "Failed validation constraint",
                constraint: err.cause.constraint,
            });
        }
        next(err);
    }
};

export const getRaceReferee = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [race] = await db
            .select({ id: races.id })
            .from(races)
            .where(eq(races.id, raceId));

        if (!race) {
            return res.status(404).json({ message: "Race not found" });
        }

        const [assignment] = await db
            .select({
                id: refereeAssignments.id,
                raceId: refereeAssignments.raceId,
                assignedAt: refereeAssignments.assignedAt,
                referee: {
                    id: users.id,
                    fullName: users.fullName,
                    email: users.email,
                },
            })
            .from(refereeAssignments)
            .innerJoin(users, eq(refereeAssignments.refereeId, users.id))
            .where(eq(refereeAssignments.raceId, raceId));

        if (!assignment) {
            return res
                .status(404)
                .json({ message: "No referee assigned to this race" });
        }

        res.json(assignment);
    } catch (err) {
        next(err);
    }
};

export const getRaceReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [race] = await db
            .select({
                id: races.id,
                name: races.name,
                raceNumber: races.raceNumber,
                distanceMeters: courseDistances.distanceMeters,
                courseName: raceCourses.name,
                courseCity: raceCourses.city,
                surfaceType: raceCourses.surfaceType,
                scheduledAt: races.scheduleAt,
                laneCount: races.laneCount,
                status: races.status,
                tournament: {
                    id: tournaments.id,
                    name: tournaments.name,
                },
            })
            .from(races)
            .leftJoin(tournaments, eq(races.tournamentId, tournaments.id))
            .leftJoin(courseDistances, eq(races.courseDistanceId, courseDistances.id))
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(eq(races.id, raceId));

        if (!race) {
            return res.status(404).json({ message: "Race not found" });
        }

        const [report] = await db
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
                referee: {
                    id: users.id,
                    fullName: users.fullName,
                },
            })
            .from(raceResults)
            .leftJoin(users, eq(raceResults.refereeConfirmedBy, users.id))
            .where(eq(raceResults.raceId, raceId));

        const referees = await db
            .select({
                id: users.id,
                fullName: users.fullName,
                assignedAt: refereeAssignments.assignedAt,
            })
            .from(refereeAssignments)
            .innerJoin(users, eq(refereeAssignments.refereeId, users.id))
            .where(eq(refereeAssignments.raceId, raceId));

        const placements = await db
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
            .orderBy(raceResultEntries.finishedPosition);

        res.json({
            race,
            referees,
            report,
            placements,
        });
    } catch (err) {
        next(err);
    }
};

export const assignRaceReferee = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const admin = req.user!;
        const { refereeId } = req.body;

        const result = await db.transaction(async (tx) => {
            const [race] = await tx
                .select({ id: races.id })
                .from(races)
                .where(eq(races.id, raceId));

            if (!race) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Race not found",
                };
            }

            const [referee] = await tx
                .select({ id: users.id, role: users.role })
                .from(users)
                .where(eq(users.id, refereeId));

            if (!referee) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Referee not found",
                };
            }
            if (referee.role !== "referee") {
                return {
                    ok: false as const,
                    status: 400,
                    message: "User is not a referee",
                };
            }

            const [assignment] = await tx
                .insert(refereeAssignments)
                .values({ raceId, refereeId, assignedBy: admin.id })
                .onConflictDoUpdate({
                    target: refereeAssignments.raceId,
                    set: {
                        refereeId,
                        assignedBy: admin.id,
                        assignedAt: new Date(),
                    },
                })
                .returning();

            return { ok: true as const, assignment };
        });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        res.json({ assignment: result.assignment });
    } catch (err) {
        next(err);
    }
};

export const publishRaceResult = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [report] = await db
            .select({ id: raceResults.id, status: raceResults.resultStatus })
            .from(raceResults)
            .where(eq(raceResults.raceId, raceId));

        if (!report) {
            return res.status(404).json({
                message: "No report found. Referee must submit first.",
            });
        }

        if (report.status !== "referee_confirmed") {
            return res.status(409).json({
                message: "Report must be referee_confirmed before publishing",
            });
        }

        const [race] = await db
            .select({ status: races.status })
            .from(races)
            .where(eq(races.id, raceId));

        await db.transaction(async (tx) => {
            const [updated] = await tx
                .update(raceResults)
                .set({
                    resultStatus: "published",
                    publishedBy: req.user!.id,
                    publishedAt: new Date(),
                })
                .where(eq(raceResults.id, report.id))
                .returning();

            if (!updated) {
                throw new Error("Failed to publish report");
            }

            const [updatedRace] = await tx
                .update(races)
                .set({ status: "completed" })
                .where(eq(races.id, raceId))
                .returning();

            if (!updatedRace) {
                throw new Error("Failed to complete race");
            }

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

        res.json({ message: "Race result published and race completed" });
    } catch (err) {
        next(err);
    }
};
