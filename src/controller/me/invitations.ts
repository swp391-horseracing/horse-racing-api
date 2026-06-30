import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import db from "../../config/db.js";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { jockeyInvitations } from "../../schema/jockeyInvitations.js";
import { raceEntries } from "../../schema/raceEntries.js";
import { races } from "../../schema/races.js";
import { raceCourses } from "../../schema/raceCourses.js";
import { courseDistances } from "../../schema/courseDistances.js";
import { horses } from "../../schema/horses.js";
import { users } from "../../schema/users.js";
import {
    inviteJockeySchema,
    invitationsQuerySchema,
} from "../../validator/jockeyInvitation.js";
import { getPagination, paginatedResponse } from "../../utils/paginate.js";

// OWNER INVITATIONS — owner manages invitations they send
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
        const { jockeyId, entryId } = parsed.data;

        const result = await db.transaction(async (tx) => {
            // Verify this owner has this horse entered in this race
            const [entry] = await tx
                .select({
                    id: raceEntries.id,
                    horseId: raceEntries.horseId,
                    jockeyId: raceEntries.jockeyId,
                })
                .from(raceEntries)
                .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                .where(
                    and(
                        eq(raceEntries.raceId, raceId),
                        eq(raceEntries.id, entryId),
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
            if (entry.jockeyId) {
                return {
                    ok: false as const,
                    status: 409,
                    message:
                        "A jockey already confirmed for this horse to join this race",
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
                .values({
                    raceId,
                    horseId: entry.horseId,
                    ownerId: user.id,
                    jockeyId,
                })
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

// JOCKEY INVITATIONS — jockey manages invitations they receive
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

export const declineInvitation = async (
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
            .set({ status: "declined", respondedAt: new Date() })
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
                .json({ message: "Only pending invitations can be declined" });
        }

        return res.json({ invitation: updated });
    } catch (err) {
        next(err);
    }
};
