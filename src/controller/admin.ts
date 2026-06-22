import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import {
    tournamentReadinessSchema,
    usersQuerySchema,
} from "../validator/admin.js";
import { users } from "../schema/users.js";
import {
    and,
    desc,
    eq,
    ilike,
    inArray,
    isNotNull,
    isNull,
    sql,
} from "drizzle-orm";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import db from "../config/db.js";
import { tournaments } from "../schema/tournament.js";
import { races } from "../schema/races.js";
import { predictions } from "../schema/predictions.js";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { eventBus } from "../websocket/eventBus.js";

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

async function resolvePredictions(raceId: string) {
    const results = await db
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

    const pendingPredictions = await db
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
            ? db
                  .update(predictions)
                  .set({ isCorrect: true, rewardAmount: "100.00" })
                  .where(inArray(predictions.id, correctIds))
            : Promise.resolve(),
        incorrectIds.length > 0
            ? db
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
