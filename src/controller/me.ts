import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import db from "../config/db.js";
import { users } from "../schema/users.js";
import { and, eq, ilike, inArray, isNull, ne, sql, desc } from "drizzle-orm";
import { jockeyProfile } from "../schema/jockeyProfile.js";
import { raceEntries } from "../schema/raceEntries.js";
import { races } from "../schema/races.js";
import { raceResults } from "../schema/raceResults.js";
import { courseDistances } from "../schema/courseDistances.js";
import { raceCourses } from "../schema/raceCourses.js";
import {
    tournamentRacesQuerySchema,
    myRegistrationsQuerySchema,
} from "../validator/tournament.js";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import { horses } from "../schema/horses.js";
import { predictions } from "../schema/predictions.js";
import { alias } from "drizzle-orm/pg-core";
import { tournamentRegistrations } from "../schema/tournamentRegistrations.js";
import { tournaments } from "../schema/tournament.js";
import { refereeAssignments } from "../schema/refereeAssignments.js";
import { jockeyInvitations } from "../schema/jockeyInvitations.js";
import {
    inviteJockeySchema,
    invitationsQuerySchema,
} from "../validator/jockeyInvitation.js";
import { predictionsQuerySchema } from "../validator/prediction.js";

const getJockeyUser = async (userId: string) => {
    const [result] = await db
        .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            phone: users.phone,
            address: users.address,
            avatarUrl: users.avatar_url,
            role: users.role,
            status: users.status,
            weightKg: jockeyProfile.weightKg,
            experienceYear: jockeyProfile.experienceYear,
        })
        .from(users)
        .leftJoin(jockeyProfile, eq(jockeyProfile.userId, userId))
        .where(eq(users.id, userId));

    if (!result) {
        return null;
    }

    return result;
};

const getRegularUser = async (userId: string) => {
    const [result] = await db
        .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            phone: users.phone,
            address: users.address,
            avatarUrl: users.avatar_url,
            role: users.role,
            status: users.status,
        })
        .from(users)
        .where(eq(users.id, userId));

    if (!result) {
        return null;
    }

    return result;
};

export const getMeProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userProfile =
            req.user?.role === "jockey"
                ? await getJockeyUser(user.id)
                : await getRegularUser(user.id);

        res.json(userProfile);
    } catch (err) {
        next(err);
    }
};

// ME RACES
const getJockeyRaces = async (
    userId: string,
    limit: number,
    offset: number,
) => {
    const whereCondition = eq(raceEntries.jockeyId, userId);
    const [data, count] = await Promise.all([
        db
            .select({
                id: races.id,
                tournamentId: races.tournamentId,
                name: races.name,
                distanceMeters: courseDistances.distanceMeters,
                scheduledAt: races.scheduleAt,
                venue: raceCourses.name,
                status: races.status,
                ride: horses.name,
                laneNumber: raceEntries.laneNumber,
                entryStatus: raceEntries.entryStatus,
                confirmedAt: raceEntries.confirmedAt,
                horseOwner: users.fullName,
            })
            .from(races)
            .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .innerJoin(users, eq(horses.ownerId, users.id))
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(whereCondition)
            .limit(limit)
            .offset(offset)
            .orderBy(races.scheduleAt),

        db
            .select({ count: sql<number>`count(*)` })
            .from(races)
            .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
            .where(whereCondition),
    ]);

    return { data, count };
};

const getOwnerRaces = async (userId: string, limit: number, offset: number) => {
    const whereCondition = and(eq(horses.ownerId, userId));
    const [data, count] = await Promise.all([
        db
            .selectDistinctOn([races.id], {
                id: races.id,
                tournamentId: races.tournamentId,
                name: races.name,
                distanceMeters: courseDistances.distanceMeters,
                trackCondition: raceCourses.surfaceType,
                scheduledAt: races.scheduleAt,
                venue: raceCourses.name,
                laneCount: races.laneCount,
                status: races.status,
            })
            .from(races)
            .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(whereCondition)
            .limit(limit)
            .offset(offset)
            .orderBy(races.id, races.scheduleAt),
        db
            .select({ count: sql<number>`count(distinct(${races.id}))` })
            .from(races)
            .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .where(whereCondition),
    ]);

    return { data, count };
};

const getRefereeRaces = async (
    userId: string,
    limit: number,
    offset: number,
) => {
    const whereCondition = eq(refereeAssignments.refereeId, userId);
    const [data, count] = await Promise.all([
        db
            .select({
                id: races.id,
                tournamentId: races.tournamentId,
                name: races.name,
                raceNumber: races.raceNumber,
                distanceMeters: courseDistances.distanceMeters,
                trackCondition: raceCourses.surfaceType,
                scheduledAt: races.scheduleAt,
                venue: raceCourses.name,
                laneCount: races.laneCount,
                status: races.status,
                tournamentName: tournaments.name,
                resultStatus: raceResults.resultStatus,
            })
            .from(refereeAssignments)
            .innerJoin(races, eq(refereeAssignments.raceId, races.id))
            .leftJoin(tournaments, eq(races.tournamentId, tournaments.id))
            .leftJoin(raceResults, eq(raceResults.raceId, races.id))
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(whereCondition)
            .limit(limit)
            .offset(offset)
            .orderBy(races.scheduleAt),
        db
            .select({ count: sql<number>`count(*)` })
            .from(refereeAssignments)
            .innerJoin(races, eq(refereeAssignments.raceId, races.id))
            .where(whereCondition),
    ]);

    return { data, count };
};

export const getMeRaces = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = tournamentRacesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: { data: any[]; count: any[] } | undefined;

        switch (user.role) {
            case "jockey":
                result = await getJockeyRaces(user.id, l, offset);
                break;
            case "horse_owner":
                result = await getOwnerRaces(user.id, l, offset);
                break;
            case "referee":
                result = await getRefereeRaces(user.id, l, offset);
                break;
            default:
                return res
                    .status(403)
                    .json({ success: false, error: "Invalid user role" });
        }

        return res.json(
            paginatedResponse(
                result?.data ?? [],
                Number(result?.count[0]?.count ?? 0),
                p,
                l,
            ),
        );
    } catch (err) {
        next(err);
    }
};

const getJockeyRaceDetail = async (userId: string, raceId: string) => {
    const whereCondition = and(
        eq(raceEntries.jockeyId, userId),
        eq(races.id, raceId),
    );
    const [data] = await db
        .select({
            id: races.id,
            tournamentId: races.tournamentId,
            horsesId: horses.id,
            horseName: horses.name,
            horseBreed: horses.breed,
            horseWeight: horses.weightKg,
            ownerId: users.id,
            ownerName: users.fullName,
            name: races.name,
            distanceMeters: courseDistances.distanceMeters,
            trackCondition: raceCourses.surfaceType,
            scheduledAt: races.scheduleAt,
            venue: raceCourses.name,
            laneCount: races.laneCount,
            status: races.status,
            laneNumber: raceEntries.laneNumber,
            entryStatus: raceEntries.entryStatus,
            confirmedAt: raceEntries.confirmedAt,
        })
        .from(races)
        .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
        .innerJoin(horses, eq(raceEntries.horseId, horses.id))
        .innerJoin(users, eq(horses.ownerId, users.id))
        .leftJoin(
            courseDistances,
            eq(races.courseDistanceId, courseDistances.id),
        )
        .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
        .where(whereCondition)
        .orderBy(races.scheduleAt);

    return data;
};

const getOwnerRaceDetail = async (userId: string, raceId: string) => {
    const whereCondition = and(
        eq(horses.ownerId, userId),
        eq(races.id, raceId),
    );
    const [data] = await db
        .select({
            id: races.id,
            tournamentId: races.tournamentId,
            name: races.name,
            distanceMeters: courseDistances.distanceMeters,
            trackCondition: raceCourses.surfaceType,
            scheduledAt: races.scheduleAt,
            venue: raceCourses.name,
            laneCount: races.laneCount,
            status: races.status,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            horses: sql<any[]>`json_agg(json_build_object(
                    'id', ${horses.id},
                    'name', ${horses.name},
                    'laneNumber', ${raceEntries.laneNumber},
                    'entryStatus', ${raceEntries.entryStatus},
                    'confirmedAt', ${raceEntries.confirmedAt}
                ))`.as("horses"),
        })
        .from(races)
        .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
        .innerJoin(horses, eq(raceEntries.horseId, horses.id))
        .leftJoin(
            courseDistances,
            eq(races.courseDistanceId, courseDistances.id),
        )
        .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
        .groupBy(
            races.id,
            courseDistances.distanceMeters,
            raceCourses.surfaceType,
            raceCourses.name,
        )
        .where(whereCondition)
        .orderBy(races.scheduleAt);

    return data;
};

export const getMeRaceDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user;
        const raceId = req.params.raceId as string;

        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let result;

        switch (user.role) {
            case "jockey":
                result = await getJockeyRaceDetail(user.id, raceId);
                break;
            case "horse_owner":
                result = await getOwnerRaceDetail(user.id, raceId);
                break;
            default:
                return res
                    .status(403)
                    .json({ success: false, error: "Invalid user role" });
        }

        if (!result) {
            return res.status(404).json({ message: "Race not exists" });
        }

        return res.json(result);
    } catch (err) {
        next(err);
    }
};

// OWNER REGISTRATIONS
export const getMyRegistrations = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;

        const parsed = myRegistrationsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        const { status, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const condition = and(
            eq(tournamentRegistrations.ownerId, user.id),
            status ? eq(tournamentRegistrations.status, status) : undefined,
        );

        const [registrations, count] = await Promise.all([
            db
                .select({
                    id: tournamentRegistrations.registrationId,
                    status: tournamentRegistrations.status,
                    submittedAt: tournamentRegistrations.submittedAt,
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
                .where(condition)
                .limit(l)
                .offset(offset)
                .orderBy(tournamentRegistrations.submittedAt),
            db
                .select({ count: sql<number>`count(*)` })
                .from(tournamentRegistrations)
                .where(condition),
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

// OWNER INVITATIONS
export const getRaceInvitations = async (
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

        const parsed = invitationsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        const { status, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const condition = and(
            eq(jockeyInvitations.raceId, raceId),
            eq(jockeyInvitations.ownerId, user.id),
            status ? eq(jockeyInvitations.status, status) : undefined,
        );

        const [invitations, count] = await Promise.all([
            db
                .select({
                    id: jockeyInvitations.invitationId,
                    status: jockeyInvitations.status,
                    invitedAt: jockeyInvitations.invitedAt,
                    horse: {
                        id: horses.id,
                        name: horses.name,
                        breed: horses.breed,
                    },
                    jockey: {
                        id: users.id,
                        fullName: users.fullName,
                    },
                })
                .from(jockeyInvitations)
                .innerJoin(horses, eq(jockeyInvitations.horseId, horses.id))
                .innerJoin(users, eq(jockeyInvitations.jockeyId, users.id))
                .where(condition)
                .limit(l)
                .offset(offset)
                .orderBy(jockeyInvitations.invitedAt),
            db
                .select({ count: sql<number>`count(*)` })
                .from(jockeyInvitations)
                .where(condition),
        ]);

        return res.json(
            paginatedResponse(invitations, Number(count[0]?.count ?? 0), p, l),
        );
    } catch (err) {
        next(err);
    }
};

export const inviteJockey = async (
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

        const parsed = inviteJockeySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        const { jockeyId, horseId } = parsed.data;

        const result = await db.transaction(async (tx) => {
            // Verify this owner has this horse entered in this race
            const [entry] = await tx
                .select({ id: raceEntries.id })
                .from(raceEntries)
                .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                .where(
                    and(
                        eq(raceEntries.raceId, raceId),
                        eq(raceEntries.horseId, horseId),
                        eq(horses.ownerId, user.id),
                    ),
                );

            if (!entry) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "No race entry found for this horse in this race",
                };
            }

            // Verify jockey exists with correct role
            const [jockey] = await tx
                .select({ id: users.id, role: users.role })
                .from(users)
                .where(eq(users.id, jockeyId));

            if (!jockey) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Jockey not found",
                };
            }
            if (jockey.role !== "jockey") {
                return {
                    ok: false as const,
                    status: 400,
                    message: "User is not a jockey",
                };
            }

            // Check this owner doesn't already have a pending invitation to this jockey for this race
            const [existing] = await tx
                .select({ id: jockeyInvitations.invitationId })
                .from(jockeyInvitations)
                .where(
                    and(
                        eq(jockeyInvitations.raceId, raceId),
                        eq(jockeyInvitations.jockeyId, jockeyId),
                        eq(jockeyInvitations.ownerId, user.id),
                        eq(jockeyInvitations.status, "pending"),
                    ),
                );

            if (existing) {
                return {
                    ok: false as const,
                    status: 409,
                    message:
                        "You already have a pending invitation to this jockey for this race",
                };
            }

            const [invitation] = await tx
                .insert(jockeyInvitations)
                .values({ raceId, horseId, ownerId: user.id, jockeyId })
                .returning();

            return { ok: true as const, invitation };
        });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        return res.status(201).json({ invitation: result.invitation });
    } catch (err) {
        next(err);
    }
};

export const cancelInvitation = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;
        const { raceId, id } = req.params as { raceId: string; id: string };
        if (!uuidValidate(raceId) || !uuidValidate(id)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [invitation] = await db
            .select({
                ownerId: jockeyInvitations.ownerId,
            })
            .from(jockeyInvitations)
            .where(
                and(
                    eq(jockeyInvitations.invitationId, id),
                    eq(jockeyInvitations.raceId, raceId),
                ),
            );

        if (!invitation) {
            return res.status(404).json({ message: "Invitation not found" });
        }
        if (invitation.ownerId !== user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const [updated] = await db
            .update(jockeyInvitations)
            .set({ status: "cancelled", respondedAt: new Date() })
            .where(
                and(
                    eq(jockeyInvitations.invitationId, id),
                    eq(jockeyInvitations.status, "pending"),
                ),
            )
            .returning();

        if (!updated) {
            return res
                .status(409)
                .json({ message: "Only pending invitations can be cancelled" });
        }

        return res.json({ invitation: updated });
    } catch (err) {
        next(err);
    }
};

export const confirmJockey = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;
        const { raceId, id } = req.params as { raceId: string; id: string };
        if (!uuidValidate(raceId) || !uuidValidate(id)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const result = await db.transaction(async (tx) => {
            const [invitation] = await tx
                .select({
                    ownerId: jockeyInvitations.ownerId,
                    jockeyId: jockeyInvitations.jockeyId,
                    horseId: jockeyInvitations.horseId,
                    status: jockeyInvitations.status,
                })
                .from(jockeyInvitations)
                .where(
                    and(
                        eq(jockeyInvitations.invitationId, id),
                        eq(jockeyInvitations.raceId, raceId),
                    ),
                );

            if (!invitation) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Invitation not found",
                };
            }
            if (invitation.ownerId !== user.id) {
                return {
                    ok: false as const,
                    status: 403,
                    message: "Forbidden",
                };
            }
            if (invitation.status !== "accepted") {
                return {
                    ok: false as const,
                    status: 409,
                    message:
                        "Only invitations accepted by the jockey can be selected",
                };
            }

            // Ensure the race entry exists before confirming
            const [existingEntry] = await tx
                .select({ id: raceEntries.id })
                .from(raceEntries)
                .where(
                    and(
                        eq(raceEntries.raceId, raceId),
                        eq(raceEntries.horseId, invitation.horseId),
                    ),
                );

            if (!existingEntry) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Race entry not found",
                };
            }

            // Assign the chosen jockey and confirm the race entry, unless
            // another jockey has already been confirmed for this horse
            const [entry] = await tx
                .update(raceEntries)
                .set({
                    jockeyId: invitation.jockeyId,
                    entryStatus: "confirmed",
                    confirmedAt: new Date(),
                })
                .where(
                    and(
                        eq(raceEntries.raceId, raceId),
                        eq(raceEntries.horseId, invitation.horseId),
                        isNull(raceEntries.jockeyId),
                    ),
                )
                .returning();

            if (!entry) {
                return {
                    ok: false as const,
                    status: 409,
                    message:
                        "A jockey has already been confirmed for this horse",
                };
            }

            // Decline the other invitations (pending or accepted) for this horse entry
            await tx
                .update(jockeyInvitations)
                .set({ status: "declined", respondedAt: new Date() })
                .where(
                    and(
                        eq(jockeyInvitations.raceId, raceId),
                        eq(jockeyInvitations.horseId, invitation.horseId),
                        inArray(jockeyInvitations.status, [
                            "pending",
                            "accepted",
                        ]),
                        ne(jockeyInvitations.invitationId, id),
                    ),
                );

            return { ok: true as const, entry };
        });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        return res.json({ entry: result.entry });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err?.cause?.code === "23505") {
            return res.status(409).json({
                message:
                    "This jockey is already assigned to another horse in this race",
            });
        }
        next(err);
    }
};

// JOCKEY INVITATIONS
const getJockeyInvitations = async (
    userId: string,
    status: "pending" | "accepted" | "cancelled" | "declined" | undefined,
    limit: number,
    offset: number,
) => {
    const condition = and(
        eq(jockeyInvitations.jockeyId, userId),
        status ? eq(jockeyInvitations.status, status) : undefined,
    );
    const [data, count] = await Promise.all([
        db
            .select({
                id: jockeyInvitations.invitationId,
                status: jockeyInvitations.status,
                invitedAt: jockeyInvitations.invitedAt,
                respondedAt: jockeyInvitations.respondedAt,
                race: {
                    id: races.id,
                    name: races.name,
                    scheduledAt: races.scheduleAt,
                    venue: raceCourses.name,
                    status: races.status,
                },
                horse: {
                    id: horses.id,
                    name: horses.name,
                    breed: horses.breed,
                },
                owner: {
                    id: users.id,
                    fullName: users.fullName,
                },
            })
            .from(jockeyInvitations)
            .innerJoin(races, eq(jockeyInvitations.raceId, races.id))
            .innerJoin(horses, eq(jockeyInvitations.horseId, horses.id))
            .innerJoin(users, eq(jockeyInvitations.ownerId, users.id))
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(condition)
            .limit(limit)
            .offset(offset)
            .orderBy(jockeyInvitations.invitedAt),
        db
            .select({ count: sql<number>`count(*)` })
            .from(jockeyInvitations)
            .where(condition),
    ]);
    return { data, count };
};

export const getMyInvitations = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;

        const parsed = invitationsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        const { status, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const result = await getJockeyInvitations(user.id, status, l, offset);

        return res.json(
            paginatedResponse(
                result.data,
                Number(result.count[0]?.count ?? 0),
                p,
                l,
            ),
        );
    } catch (err) {
        next(err);
    }
};

export const getInvitationDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;
        const { id } = req.params as { id: string };
        if (!uuidValidate(id)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [invitation] = await db
            .select({
                id: jockeyInvitations.invitationId,
                status: jockeyInvitations.status,
                invitedAt: jockeyInvitations.invitedAt,
                respondedAt: jockeyInvitations.respondedAt,
                race: {
                    id: races.id,
                    name: races.name,
                    distanceMeters: courseDistances.distanceMeters,
                    trackCondition: raceCourses.surfaceType,
                    scheduledAt: races.scheduleAt,
                    venue: raceCourses.name,
                    laneCount: races.laneCount,
                    status: races.status,
                },
                horse: {
                    id: horses.id,
                    name: horses.name,
                    breed: horses.breed,
                    weightKg: horses.weightKg,
                },
                owner: {
                    id: users.id,
                    fullName: users.fullName,
                },
            })
            .from(jockeyInvitations)
            .innerJoin(races, eq(jockeyInvitations.raceId, races.id))
            .innerJoin(horses, eq(jockeyInvitations.horseId, horses.id))
            .innerJoin(users, eq(jockeyInvitations.ownerId, users.id))
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(
                and(
                    eq(jockeyInvitations.invitationId, id),
                    eq(jockeyInvitations.jockeyId, user.id),
                ),
            );

        if (!invitation) {
            return res.status(404).json({ message: "Invitation not found" });
        }

        return res.json(invitation);
    } catch (err) {
        next(err);
    }
};

export const acceptInvitation = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;
        const { id } = req.params as { id: string };
        if (!uuidValidate(id)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [invitation] = await db
            .select({
                jockeyId: jockeyInvitations.jockeyId,
            })
            .from(jockeyInvitations)
            .where(eq(jockeyInvitations.invitationId, id));

        if (!invitation) {
            return res.status(404).json({ message: "Invitation not found" });
        }
        if (invitation.jockeyId !== user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const [updated] = await db
            .update(jockeyInvitations)
            .set({ status: "accepted", respondedAt: new Date() })
            .where(
                and(
                    eq(jockeyInvitations.invitationId, id),
                    eq(jockeyInvitations.jockeyId, user.id),
                    eq(jockeyInvitations.status, "pending"),
                ),
            )
            .returning();

        if (!updated) {
            return res
                .status(409)
                .json({ message: "Only pending invitations can be accepted" });
        }

        return res.json({ invitation: updated });
    } catch (err) {
        next(err);
    }
};

// spectator predictions
export const getMyPredictions = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;

        const parsed = predictionsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { search, status, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const re = alias(raceEntries, "re");
        const h = alias(horses, "h");

        const conditions = and(
            eq(predictions.spectatorId, user.id),
            search ? ilike(races.name, `%${search}%`) : undefined,
            status === "pending"
                ? isNull(predictions.isCorrect)
                : status === "correct"
                  ? eq(predictions.isCorrect, true)
                  : status === "incorrect"
                    ? eq(predictions.isCorrect, false)
                    : undefined,
        );

        const [data, count] = await Promise.all([
            db
                .select({
                    id: predictions.id,
                    race: {
                        id: races.id,
                        name: races.name,
                        distanceMeters: courseDistances.distanceMeters,
                        scheduledAt: races.scheduleAt,
                        venue: raceCourses.name,
                        status: races.status,
                    },
                    predictedEntry: {
                        entryId: predictions.predictedEntryId,
                        horseName: h.name,
                    },
                    predictedPosition: predictions.predictedPosition,
                    placedAt: predictions.placedAt,
                    isCorrect: predictions.isCorrect,
                    rewardAmount: predictions.rewardAmount,
                })
                .from(predictions)
                .innerJoin(races, eq(predictions.raceId, races.id))
                .innerJoin(re, eq(predictions.predictedEntryId, re.id))
                .innerJoin(h, eq(re.horseId, h.id))
                .leftJoin(
                    courseDistances,
                    eq(races.courseDistanceId, courseDistances.id),
                )
                .leftJoin(
                    raceCourses,
                    eq(courseDistances.courseId, raceCourses.id),
                )
                .where(conditions)
                .limit(l)
                .offset(offset)
                .orderBy(desc(predictions.placedAt)),
            db
                .select({ count: sql<number>`count(*)` })
                .from(predictions)
                .innerJoin(races, eq(predictions.raceId, races.id))
                .where(conditions),
        ]);

        return res.json(
            paginatedResponse(data, Number(count[0]?.count ?? 0), p, l),
        );
    } catch (err) {
        next(err);
    }
};
