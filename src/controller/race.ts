import { NextFunction, Request, Response } from "express";
import db from "../config/db.js";
import { races } from "../schema/races.js";
import { eq, ne, and } from "drizzle-orm";

export const getRace = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;

        const [race] = await db
            .select()
            .from(races)
            .where(and(eq(races.id, raceId), ne(races.status, "draft")));

        if (!race) {
            return res.json({ message: "Race not exist" });
        }

        res.json(race);
    } catch (err) {
        next(err);
    }
};
