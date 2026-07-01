import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import db from "../../config/db.js";
import { and, eq, sql } from "drizzle-orm";
import { raceResultEntries } from "../../schema/raceResultEntries.js";
import { raceEntries } from "../../schema/raceEntries.js";
import { raceResults } from "../../schema/raceResults.js";
import { races } from "../../schema/races.js";
import { horses } from "../../schema/horses.js";
import { users } from "../../schema/users.js";
import { courseDistances } from "../../schema/courseDistances.js";
import { raceCourses } from "../../schema/raceCourses.js";
import { getPagination, paginatedResponse } from "../../utils/paginate.js";
import { tournamentRacesQuerySchema } from "../../validator/tournament.js";

const resultEntryFields = {
    entryId: raceResultEntries.entryId,
    raceId: races.id,
    raceName: races.name,
    scheduledAt: races.scheduleAt,
    venue: raceCourses.name,
    distanceMeters: courseDistances.distanceMeters,
    raceStatus: races.status,
    resultStatus: raceResults.resultStatus,
    laneNumber: raceEntries.laneNumber,
    horseId: horses.id,
    horseName: horses.name,
    jockeyId: users.id,
    jockeyName: users.fullName,
    finishedPosition: raceResultEntries.finishedPosition,
    finishTime: raceResultEntries.finishTime,
    finishStatus: raceResultEntries.finishStatus,
    points: raceResultEntries.points,
};

const getJockeyResults = async (
    userId: string,
    limit: number,
    offset: number,
) => {
    const whereCondition = eq(raceEntries.jockeyId, userId);

    const [data, countArr] = await Promise.all([
        db
            .select(resultEntryFields)
            .from(raceResultEntries)
            .innerJoin(
                raceEntries,
                eq(raceResultEntries.entryId, raceEntries.id),
            )
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .innerJoin(users, eq(raceEntries.jockeyId, users.id))
            .innerJoin(races, eq(raceResultEntries.raceId, races.id))
            .innerJoin(
                raceResults,
                eq(raceResultEntries.resultId, raceResults.id),
            )
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
            .from(raceResultEntries)
            .innerJoin(
                raceEntries,
                eq(raceResultEntries.entryId, raceEntries.id),
            )
            .innerJoin(
                raceResults,
                eq(raceResultEntries.resultId, raceResults.id),
            )
            .where(whereCondition),
    ]);

    return { data, count: Number(countArr[0]?.count ?? 0) };
};

const getOwnerResults = async (
    userId: string,
    limit: number,
    offset: number,
) => {
    const whereCondition = eq(horses.ownerId, userId);

    const [data, countArr] = await Promise.all([
        db
            .select(resultEntryFields)
            .from(raceResultEntries)
            .innerJoin(
                raceEntries,
                eq(raceResultEntries.entryId, raceEntries.id),
            )
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .leftJoin(users, eq(raceEntries.jockeyId, users.id))
            .innerJoin(races, eq(raceResultEntries.raceId, races.id))
            .innerJoin(
                raceResults,
                eq(raceResultEntries.resultId, raceResults.id),
            )
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
            .from(raceResultEntries)
            .innerJoin(
                raceEntries,
                eq(raceResultEntries.entryId, raceEntries.id),
            )
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .innerJoin(races, eq(raceResultEntries.raceId, races.id))
            .innerJoin(
                raceResults,
                eq(raceResultEntries.resultId, raceResults.id),
            )
            .where(whereCondition),
    ]);

    return { data, count: Number(countArr[0]?.count ?? 0) };
};

export const getMyResults = async (
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
        let result: { data: any[]; count: number } | undefined;

        switch (user.role) {
            case "jockey":
                result = await getJockeyResults(user.id, l, offset);
                break;
            case "horse_owner":
                result = await getOwnerResults(user.id, l, offset);
                break;
            default:
                return res
                    .status(403)
                    .json({ success: false, error: "Invalid user role" });
        }

        return res.json(
            paginatedResponse(result?.data ?? [], result?.count ?? 0, p, l),
        );
    } catch (err) {
        next(err);
    }
};

const getMyRaceResultDetail = async (userId: string, raceId: string) => {
    const entries = await db
        .select(resultEntryFields)
        .from(raceResultEntries)
        .innerJoin(raceEntries, eq(raceResultEntries.entryId, raceEntries.id))
        .innerJoin(horses, eq(raceEntries.horseId, horses.id))
        .leftJoin(users, eq(raceEntries.jockeyId, users.id))
        .innerJoin(races, eq(raceResultEntries.raceId, races.id))
        .innerJoin(raceResults, eq(raceResultEntries.resultId, raceResults.id))
        .leftJoin(
            courseDistances,
            eq(races.courseDistanceId, courseDistances.id),
        )
        .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
        .where(
            and(
                eq(raceResultEntries.raceId, raceId),
                eq(raceEntries.jockeyId, userId),
            ),
        )
        .orderBy(raceResultEntries.finishedPosition, raceResultEntries.id);

    return entries;
};

const getOwnerRaceResultDetail = async (userId: string, raceId: string) => {
    const entries = await db
        .select(resultEntryFields)
        .from(raceResultEntries)
        .innerJoin(raceEntries, eq(raceResultEntries.entryId, raceEntries.id))
        .innerJoin(horses, eq(raceEntries.horseId, horses.id))
        .leftJoin(users, eq(raceEntries.jockeyId, users.id))
        .innerJoin(races, eq(raceResultEntries.raceId, races.id))
        .innerJoin(raceResults, eq(raceResultEntries.resultId, raceResults.id))
        .leftJoin(
            courseDistances,
            eq(races.courseDistanceId, courseDistances.id),
        )
        .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
        .where(
            and(
                eq(raceResultEntries.raceId, raceId),
                eq(horses.ownerId, userId),
            ),
        )
        .orderBy(raceResultEntries.finishedPosition, raceResultEntries.id);

    return entries;
};

export const getMyResultDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;
        const raceId = req.params.raceId as string;

        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let entries: any[] = [];

        switch (user.role) {
            case "jockey":
                entries = await getMyRaceResultDetail(user.id, raceId);
                break;
            case "horse_owner":
                entries = await getOwnerRaceResultDetail(user.id, raceId);
                break;
            default:
                return res
                    .status(403)
                    .json({ success: false, error: "Invalid user role" });
        }

        if (entries.length === 0) {
            return res
                .status(403)
                .json({ message: "You are not involved in this race" });
        }

        return res.json({ entries });
    } catch (err) {
        next(err);
    }
};
