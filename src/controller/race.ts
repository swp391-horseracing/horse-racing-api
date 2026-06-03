import { NextFunction, Request, Response } from "express";
import db from "../config/db.js";
import { races } from "../schema/races.js";
import { validate as uuidValidate } from "uuid";
import { eq, ne, and } from "drizzle-orm";

export const getRace = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        console.log(raceId);
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [race] = await db
            .select()
            .from(races)
            .where(and(eq(races.id, raceId), ne(races.status, "draft")));

        if (!race) {
            return res.status(404).json({ message: "Race not exist" });
        }

        res.json(race);
    } catch (err) {
        next(err);
    }
};
