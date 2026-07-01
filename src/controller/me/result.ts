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
import { myResultsQuerySchema } from "../../validator/tournament.js";

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
    status?: string,
) => {
    const conditions: ReturnType<typeof eq>[] = [
        eq(raceEntries.jockeyId, userId),
        eq(raceResults.resultStatus, "published"),
    ];
    if (status)
        conditions.push(
            eq(races.status, status as typeof races.$inferSelect.status),
        );

    const whereCondition = and(...conditions);

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
    status?: string,
) => {
    const conditions: ReturnType<typeof eq>[] = [
        eq(horses.ownerId, userId),
        eq(raceResults.resultStatus, "published"),
    ];
    if (status)
        conditions.push(
            eq(races.status, status as typeof races.$inferSelect.status),
        );

    const whereCondition = and(...conditions);

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

        const parsed = myResultsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { page, limit, status } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: { data: any[]; count: number } | undefined;

        switch (user.role) {
            case "jockey":
                result = await getJockeyResults(user.id, l, offset, status);
                break;
            case "horse_owner":
                result = await getOwnerResults(user.id, l, offset, status);
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
                eq(raceResults.resultStatus, "published"),
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
                eq(raceResults.resultStatus, "published"),
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

        let isInvolved = false;

        switch (user.role) {
            case "jockey": {
                const [entry] = await db
                    .select({ id: raceEntries.id })
                    .from(raceEntries)
                    .where(
                        and(
                            eq(raceEntries.raceId, raceId),
                            eq(raceEntries.jockeyId, user.id),
                        ),
                    )
                    .limit(1);
                isInvolved = !!entry;
                break;
            }
            case "horse_owner": {
                const [entry] = await db
                    .select({ id: raceEntries.id })
                    .from(raceEntries)
                    .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                    .where(
                        and(
                            eq(raceEntries.raceId, raceId),
                            eq(horses.ownerId, user.id),
                        ),
                    )
                    .limit(1);
                isInvolved = !!entry;
                break;
            }
            default:
                return res
                    .status(403)
                    .json({ success: false, error: "Invalid user role" });
        }

        if (!isInvolved) {
            return res
                .status(403)
                .json({ message: "You are not involved in this race" });
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
        }

        if (entries.length === 0) {
            return res
                .status(404)
                .json({ message: "Result not yet available" });
        }

        return res.json({ entries });
    } catch (err) {
        next(err);
    }
};
