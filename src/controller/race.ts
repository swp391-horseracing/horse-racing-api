import { NextFunction, Request, Response } from "express";
import db from "../config/db.js";
import { races } from "../schema/races.js";
import { validate as uuidValidate } from "uuid";
import { eq, ne, and } from "drizzle-orm";
import { raceEntries } from "../schema/raceEntries.js";
import { horses } from "../schema/horses.js";
import { users } from "../schema/users.js";

export const getRace = async (
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

export const getHorseEntries = async (
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
            .select()
            .from(races)
            .where(eq(races.id, raceId));

        if (!race) {
            return res.status(404).json({ message: "Race not exist" });
        }

        const horseEntries = await db
            .select({
                id: horses.id,
                jockeyId: users.id,
                jockeyName: users.fullName,
                name: horses.name,
                breed: horses.breed,
                weightKg: horses.weightKg,
                entryStatus: raceEntries.entryStatus,
                laneNumber: raceEntries.laneNumber,
            })
            .from(races)
            .where(eq(races.id, raceId))
            .leftJoin(raceEntries, eq(races.id, raceEntries.raceId))
            .leftJoin(horses, eq(raceEntries.horseId, horses.id))
            .leftJoin(users, eq(raceEntries.jockeyId, users.id));

        res.json(horseEntries);
    } catch (err) {
        next(err);
    }
};
