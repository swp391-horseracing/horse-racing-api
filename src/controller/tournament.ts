import { NextFunction, Request, Response } from "express";
import db from "../config/db.js";
import { tournaments as tournamentsTable } from "../schema/tournament.js";
import { and, eq, ne, sql } from "drizzle-orm";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import { validate as uuidValidate } from "uuid";
import { tournamentsQuerySchema } from "../validator/tournament.js";

export const getTournaments = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const parsed = tournamentsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid Query" });
        }
        const { status, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

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
                .where(
                    and(
                        ne(tournamentsTable.status, "draft"),
                        status
                            ? eq(tournamentsTable.status, status)
                            : undefined,
                    ),
                )
                .limit(l)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)` })
                .from(tournamentsTable)
                .where(ne(tournamentsTable.status, "draft")),
        ]);

        return res.json(
            paginatedResponse(tournaments, Number(count[0]?.count ?? 0), p, l),
        );
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
        const tournamendId = req.params.id as string;

        if (!uuidValidate(tournamendId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }
        const [tournament] = await db
            .select()
            .from(tournamentsTable)
            .where(
                and(
                    eq(tournamentsTable.id, tournamendId),
                    ne(tournamentsTable.status, "draft"),
                ),
            );

        if (!tournament) {
            return res.status(404).json({ message: "Tournament not exists" });
        }

        return res.json(tournament);
    } catch (err: any) {
        next(err);
    }
};
