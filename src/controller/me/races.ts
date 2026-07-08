import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import db from "../../config/db.js";
import { and, eq, sql } from "drizzle-orm";
import { raceEntries } from "../../schema/raceEntries.js";
import { races } from "../../schema/races.js";
import { raceResults } from "../../schema/raceResults.js";
import { courseDistances } from "../../schema/courseDistances.js";
import { raceCourses } from "../../schema/raceCourses.js";
import { horses } from "../../schema/horses.js";
import { users } from "../../schema/users.js";
import { tournaments } from "../../schema/tournament.js";
import { refereeAssignments } from "../../schema/refereeAssignments.js";
import { tournamentRacesQuerySchema } from "../../validator/tournament.js";
import { getPagination, paginatedResponse } from "../../utils/paginate.js";

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
                distanceMeters: courseDistances.distanceMeters,
                scheduledAt: races.scheduleAt,
                venue: raceCourses.name,
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
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
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
            .selectDistinctOn([races.id], {
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
            .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(whereCondition)
            .limit(limit)
            .offset(offset)
            .orderBy(races.id, races.scheduleAt),
        db
            .select({ count: sql<number>`count(distinct(${races.id}))` })
            .from(races)
            .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .where(whereCondition),
    ]);

    return { data, count };
};

const getRefereeRaces = async (
    userId: string,
    limit: number,
    offset: number,
) => {
    const whereCondition = eq(refereeAssignments.refereeId, userId);
    const [data, count] = await Promise.all([
        db
            .select({
                id: races.id,
                tournamentId: races.tournamentId,
                name: races.name,
                raceNumber: races.raceNumber,
                distanceMeters: courseDistances.distanceMeters,
                trackCondition: raceCourses.surfaceType,
                scheduledAt: races.scheduleAt,
                venue: raceCourses.name,
                laneCount: races.laneCount,
                status: races.status,
                tournamentName: tournaments.name,
                resultStatus: raceResults.resultStatus,
            })
            .from(refereeAssignments)
            .innerJoin(races, eq(refereeAssignments.raceId, races.id))
            .leftJoin(tournaments, eq(races.tournamentId, tournaments.id))
            .leftJoin(raceResults, eq(raceResults.raceId, races.id))
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(whereCondition)
            .limit(limit)
            .offset(offset)
            .orderBy(races.scheduleAt),
        db
            .select({ count: sql<number>`count(*)` })
            .from(refereeAssignments)
            .innerJoin(races, eq(refereeAssignments.raceId, races.id))
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
            case "referee":
                result = await getRefereeRaces(user.id, l, offset);
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
            horseBaseSpeed: horses.baseSpeed,
            horseStamina: horses.stamina,
            horseAcceleration: horses.acceleration,
            ownerId: users.id,
            ownerName: users.fullName,
            name: races.name,
            distanceMeters: courseDistances.distanceMeters,
            trackCondition: raceCourses.surfaceType,
            scheduledAt: races.scheduleAt,
            venue: raceCourses.name,
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
        .leftJoin(
            courseDistances,
            eq(races.courseDistanceId, courseDistances.id),
        )
        .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
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
            distanceMeters: courseDistances.distanceMeters,
            trackCondition: raceCourses.surfaceType,
            scheduledAt: races.scheduleAt,
            venue: raceCourses.name,
            laneCount: races.laneCount,
            status: races.status,
            availableSlots: sql<number>`${races.laneCount} - (select count(*) from ${raceEntries} where ${raceEntries.raceId} = ${races.id})`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            horses: sql<any[]>`json_agg(json_build_object(
                    'id', ${horses.id},
                    'name', ${horses.name},
                    'baseSpeed', ${horses.baseSpeed},
                    'stamina', ${horses.stamina},
                    'acceleration', ${horses.acceleration},
                    'laneNumber', ${raceEntries.laneNumber},
                    'entryStatus', ${raceEntries.entryStatus},
                    'confirmedAt', ${raceEntries.confirmedAt}
                ))`.as("horses"),
        })
        .from(races)
        .innerJoin(raceEntries, eq(raceEntries.raceId, races.id))
        .innerJoin(horses, eq(raceEntries.horseId, horses.id))
        .leftJoin(
            courseDistances,
            eq(races.courseDistanceId, courseDistances.id),
        )
        .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
        .groupBy(
            races.id,
            courseDistances.distanceMeters,
            raceCourses.surfaceType,
            raceCourses.name,
        )
        .where(whereCondition)
        .orderBy(races.scheduleAt);

    return data;
};

const getRefereeRaceDetail = async (userId: string, raceId: string) => {
    const whereCondition = and(
        eq(refereeAssignments.refereeId, userId),
        eq(races.id, raceId),
    );
    const [data] = await db
        .select({
            id: races.id,
            tournamentId: races.tournamentId,
            name: races.name,
            raceNumber: races.raceNumber,
            distanceMeters: courseDistances.distanceMeters,
            trackCondition: raceCourses.surfaceType,
            scheduledAt: races.scheduleAt,
            venue: raceCourses.name,
            laneCount: races.laneCount,
            status: races.status,
            tournamentName: tournaments.name,
            resultStatus: raceResults.resultStatus,
        })
        .from(refereeAssignments)
        .innerJoin(races, eq(refereeAssignments.raceId, races.id))
        .leftJoin(
            courseDistances,
            eq(races.courseDistanceId, courseDistances.id),
        )
        .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
        .leftJoin(tournaments, eq(races.tournamentId, tournaments.id))
        .leftJoin(raceResults, eq(raceResults.raceId, races.id))
        .where(whereCondition);

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
            case "referee":
                result = await getRefereeRaceDetail(user.id, raceId);
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
