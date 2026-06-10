import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import db from "../config/db.js";
import { users } from "../schema/users.js";
import { and, eq, sql } from "drizzle-orm";
import { jockeyProfile } from "../schema/jockeyProfile.js";
import { raceEntries } from "../schema/raceEntries.js";
import { races } from "../schema/races.js";
import { tournamentRacesQuerySchema } from "../validator/tournament.js";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import { horses } from "../schema/horses.js";

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
                roundName: races.roundName,
                distanceMeters: races.distanceMeters,
                scheduledAt: races.scheduleAt,
                venue: races.venue,
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
            .select({
                id: races.id,
                tournamentId: races.tournamentId,
                races: races.id,
                name: races.name,
                roundName: races.roundName,
                distanceMeters: races.distanceMeters,
                trackCondition: races.trackCondition,
                scheduledAt: races.scheduleAt,
                venue: races.venue,
                laneCount: races.laneCount,
                status: races.status,
                horse: horses.name,
                jockey: users.fullName,
            })
            .from(races)
            .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
            .leftJoin(users, eq(raceEntries.jockeyId, users.id))
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .where(whereCondition)
            .limit(limit)
            .offset(offset)
            .orderBy(races.scheduleAt),
        db
            .select({ count: sql<number>`count(distinct(${races.id}))` })
            .from(races)
            .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
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
            roundName: races.roundName,
            distanceMeters: races.distanceMeters,
            trackCondition: races.trackCondition,
            scheduledAt: races.scheduleAt,
            venue: races.venue,
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
            roundName: races.roundName,
            distanceMeters: races.distanceMeters,
            trackCondition: races.trackCondition,
            scheduledAt: races.scheduleAt,
            venue: races.venue,
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
        .groupBy(races.id)
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
