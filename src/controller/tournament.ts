import { NextFunction, Request, Response } from "express";
import db from "../config/db.js";
import { tournaments as tournamentsTable } from "../schema/tournament.js";
import { and, eq, ne, sql } from "drizzle-orm";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import { validate as uuidValidate } from "uuid";
import { tournamentsQuerySchema } from "../validator/tournament.js";

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
