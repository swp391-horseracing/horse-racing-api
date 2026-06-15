import { NextFunction, Request, Response } from "express";
import db from "../config/db.js";
import { tournaments as tournamentsTable } from "../schema/tournament.js";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import { validate as uuidValidate } from "uuid";
import {
    adminTournamentsQuerySchema,
    tournamentRacesQuerySchema,
    tournamentsQuerySchema,
} from "../validator/tournament.js";
import { races } from "../schema/races.js";

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
        const { status, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const listTournamentsCondition = [
            status ? eq(tournamentsTable.status, status) : undefined,
        ];
        if (userRole !== "admin") {
            listTournamentsCondition.push(ne(tournamentsTable.status, "draft"));
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

        const listRacescondition = and(
            ne(races.status, "draft"),
            status ? eq(races.status, status) : undefined,
            eq(races.tournamentId, tournamentId),
        );

        const [tournamentRaces, count] = await Promise.all([
            db
                .select({
                    id: races.id,
                    tournamentId: races.tournamentId,
                    name: races.name,
                    roundName: races.roundName,
                    distanceMeters: races.distanceMeters,
                    trackCondition: races.trackCondition,
                    scheduledAt: races.scheduleAt,
                    venue: races.venue,
                    laneCount: races.laneCount,
                    status: races.status,
                })
                .from(races)
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
