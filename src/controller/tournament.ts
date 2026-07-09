import { NextFunction, Request, Response } from "express";
import db from "../config/db.js";
import { tournaments as tournamentsTable } from "../schema/tournament.js";
import { and, asc, desc, eq, gte, ilike, lte, ne, sql } from "drizzle-orm";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import { validate as uuidValidate } from "uuid";
import {
    adminTournamentsQuerySchema,
    tournamentRacesQuerySchema,
    tournamentsQuerySchema,
    registerForTournamentSchema,
} from "../validator/tournament.js";
import { races } from "../schema/races.js";
import { horses } from "../schema/horses.js";
import { tournamentRegistrations } from "../schema/tournamentRegistrations.js";
import { courseDistances } from "../schema/courseDistances.js";
import { raceCourses } from "../schema/raceCourses.js";
import { raceEntries } from "../schema/raceEntries.js";

const calculateAge = (birthDate: Date, referenceDate: Date): number => {
    const age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
    if (
        monthDiff < 0 ||
        (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())
    ) {
        return age - 1;
    }
    return age;
};

export const getTournaments = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userRole = req.user?.role;
        const schema =
            userRole === "admin"
                ? adminTournamentsQuerySchema
                : tournamentsQuerySchema;
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }
        const { startDateFrom, startDateTo, search, status, page, limit } =
            parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const listTournamentsCondition = [
            status ? eq(tournamentsTable.status, status) : undefined,
            search ? ilike(tournamentsTable.name, `%${search}%`) : undefined,
        ];
        if (userRole !== "admin") {
            listTournamentsCondition.push(ne(tournamentsTable.status, "draft"));
        }
        if (startDateFrom) {
            listTournamentsCondition.push(
                gte(tournamentsTable.startDate, new Date(startDateFrom)),
            );
        }
        if (startDateTo) {
            listTournamentsCondition.push(
                lte(tournamentsTable.startDate, new Date(startDateTo)),
            );
        }

        const [tournaments, count] = await Promise.all([
            db
                .select({
                    id: tournamentsTable.id,
                    name: tournamentsTable.name,
                    location: tournamentsTable.location,
                    startDate: tournamentsTable.startDate,
                    endDate: tournamentsTable.endDate,
                    registrationOpenDate: tournamentsTable.registrationOpenDate,
                    registrationCloseDate:
                        tournamentsTable.registrationCloseDate,
                    status: tournamentsTable.status,
                })
                .from(tournamentsTable)
                .where(and(...listTournamentsCondition))
                .orderBy(
                    desc(tournamentsTable.createdAt),
                    desc(tournamentsTable.id),
                )
                .limit(l)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)` })
                .from(tournamentsTable)
                .where(and(...listTournamentsCondition)),
        ]);

        return res.json(
            paginatedResponse(tournaments, Number(count[0]?.count ?? 0), p, l),
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        next(err);
    }
};

export const getTournament = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userRole = req.user?.role;
        const tournamendId = req.params.id as string;
        if (!uuidValidate(tournamendId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const conditions = [eq(tournamentsTable.id, tournamendId)];
        if (userRole !== "admin") {
            conditions.push(ne(tournamentsTable.status, "draft"));
        }

        const [tournament] = await db
            .select()
            .from(tournamentsTable)
            .where(and(...conditions));

        if (!tournament) {
            return res.status(404).json({ message: "Tournament not exists" });
        }

        return res.json(tournament);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        next(err);
    }
};

export const getTournamentRaces = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const tournamentId = req.params.id as string;

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
        const { status, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        if (!uuidValidate(tournamentId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const userRole = req.user?.role;
        const listRacescondition = and(
            userRole !== "admin" ? ne(races.status, "draft") : undefined,
            status ? eq(races.status, status) : undefined,
            eq(races.tournamentId, tournamentId),
        );

        const [tournamentRaces, count] = await Promise.all([
            db
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
                    avaiableSlots: sql<number>`${races.laneCount} - (select count(*) from ${raceEntries} where ${raceEntries.raceId} = ${races.id})`,
                })
                .from(races)
                .leftJoin(
                    courseDistances,
                    eq(races.courseDistanceId, courseDistances.id),
                )
                .leftJoin(
                    raceCourses,
                    eq(courseDistances.courseId, raceCourses.id),
                )
                .where(listRacescondition)
                .limit(l)
                .offset(offset)
                .orderBy(asc(races.scheduleAt), asc(races.id)),
            db
                .select({ count: sql<number>`count(*)` })
                .from(races)
                .where(listRacescondition),
        ]);

        if (!tournamentRaces) {
            return res.status(404).json({ message: "Tournament not exists" });
        }

        res.json(
            paginatedResponse(
                tournamentRaces,
                Number(count[0]?.count ?? 0),
                p,
                l,
            ),
        );
    } catch (err) {
        next(err);
    }
};

export const registerForTournament = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const tournamentId = req.params.id as string;
        if (!uuidValidate(tournamentId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const parsed = registerForTournamentSchema.safeParse(req.body);
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
            const [tournament] = await tx
                .select({
                    id: tournamentsTable.id,
                    status: tournamentsTable.status,
                    registrationCloseDate:
                        tournamentsTable.registrationCloseDate,
                    maximumParticipants: tournamentsTable.maximumParticipants,
                    minAge: tournamentsTable.minAge,
                    maxAge: tournamentsTable.maxAge,
                    sex: tournamentsTable.sex,
                })
                .from(tournamentsTable)
                .where(eq(tournamentsTable.id, tournamentId));

            if (!tournament) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Tournament not found",
                };
            }
            if (tournament.status !== "registration_open") {
                return {
                    ok: false as const,
                    status: 409,
                    message: "Tournament registration is not open",
                };
            }

            if (
                tournament.registrationCloseDate &&
                new Date() >= tournament.registrationCloseDate
            ) {
                return {
                    ok: false as const,
                    status: 409,
                    message: "Registration period has ended",
                };
            }

            if (tournament.maximumParticipants) {
                const [result] = await tx
                    .select({ count: sql<number>`count(*)` })
                    .from(tournamentRegistrations)
                    .where(
                        eq(tournamentRegistrations.tournamentId, tournamentId),
                    );

                if (result && result.count >= tournament.maximumParticipants) {
                    return {
                        ok: false as const,
                        status: 409,
                        message: "Tournament is full",
                    };
                }
            }

            const [horse] = await tx
                .select({
                    id: horses.id,
                    ownerId: horses.ownerId,
                    isRetired: horses.isRetired,
                })
                .from(horses)
                .where(eq(horses.id, horseId));

            if (!horse) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Horse not found",
                };
            }
            if (horse.ownerId !== req.user!.id) {
                return {
                    ok: false as const,
                    status: 403,
                    message: "Forbidden",
                };
            }
            if (horse.isRetired) {
                return {
                    ok: false as const,
                    status: 409,
                    message: "Horse is retired",
                };
            }

            const [registration] = await tx
                .insert(tournamentRegistrations)
                .values({
                    tournamentId,
                    horseId,
                    ownerId: req.user!.id,
                })
                .returning();

            return { ok: true as const, registration };
        });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        return res.status(201).json({ registration: result.registration });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err?.cause?.code === "23505") {
            return res.status(409).json({
                message: "Horse is already registered for this tournament",
            });
        }
        next(err);
    }
};

export const getTournamentRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { id: tournamentId, regId } = req.params as {
            id: string;
            regId: string;
        };
        if (!uuidValidate(tournamentId) || !uuidValidate(regId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [registration] = await db
            .select({
                id: tournamentRegistrations.registrationId,
                tournamentId: tournamentRegistrations.tournamentId,
                horseId: tournamentRegistrations.horseId,
                ownerId: tournamentRegistrations.ownerId,
                status: tournamentRegistrations.status,
                submittedAt: tournamentRegistrations.submittedAt,
                reviewedBy: tournamentRegistrations.reviewedBy,
                reviewedAt: tournamentRegistrations.reviewedAt,
                rejectReason: tournamentRegistrations.rejectReason,
            })
            .from(tournamentRegistrations)
            .where(
                and(
                    eq(tournamentRegistrations.registrationId, regId),
                    eq(tournamentRegistrations.tournamentId, tournamentId),
                ),
            );

        if (!registration) {
            return res.status(404).json({ message: "Registration not found" });
        }

        return res.json({ registration });
    } catch (err) {
        next(err);
    }
};
