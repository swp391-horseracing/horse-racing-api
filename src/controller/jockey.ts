import { NextFunction, Request, Response } from "express";
import { jockeyQuerySchema } from "../validator/jockey.js";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import { and, eq, ilike, ne, sql, desc } from "drizzle-orm";
import { validate as uuidValidate } from "uuid";
import { users } from "../schema/users.js";
import { raceEntries } from "../schema/raceEntries.js";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { raceResults } from "../schema/raceResults.js";
import { races } from "../schema/races.js";
import { horses } from "../schema/horses.js";
import { courseDistances } from "../schema/courseDistances.js";
import { raceCourses } from "../schema/raceCourses.js";
import { jockeyProfile } from "../schema/jockeyProfile.js";
import { raceHistoryQuerySchema } from "../validator/race.js";
import db from "../config/db.js";

export const getJockeys = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const parsed = jockeyQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }
        const { search, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions = and(
            search ? ilike(users.fullName, `%${search}%`) : undefined,
            ne(users.status, "locked"),
            eq(users.role, "jockey"),
        );

        const [data, count] = await Promise.all([
            db
                .select({
                    id: users.id,
                    fullName: users.fullName,
                    avatarUrl: users.avatar_url,
                    weightKg: jockeyProfile.weightKg,
                    experienceYear: jockeyProfile.experienceYear,
                    isRacing: sql<boolean>`exists(
                        select 1 from ${raceEntries} re
                        inner join ${races} r on r.id = re.race_id
                        where re.jockey_id = ${users.id}
                        and re.entry_status = 'confirmed'
                        and r.status != 'completed'
                        and r.status != 'cancelled'
                    )`,
                })
                .from(users)
                .leftJoin(jockeyProfile, eq(jockeyProfile.userId, users.id))
                .where(conditions)
                .limit(l)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)` })
                .from(users)
                .where(conditions),
        ]);

        return res.json(
            paginatedResponse(data, Number(count[0]?.count ?? 0), p, l),
        );
    } catch (err) {
        next(err);
    }
};

export const getJockeyRaceHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const jockeyId = req.params.jockeyId as string;
        if (!uuidValidate(jockeyId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const parsed = raceHistoryQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation error",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { page, limit, status } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions: ReturnType<typeof and> = and(
            eq(raceEntries.jockeyId, jockeyId),
            eq(raceResults.resultStatus, "published"),
            status ? eq(races.status, status as typeof races.$inferSelect.status) : undefined,
        );

        const [data, countArr, statsArr] = await Promise.all([
            db
                .select({
                    raceId: races.id,
                    raceName: races.name,
                    raceNumber: races.raceNumber,
                    scheduledAt: races.scheduleAt,
                    venue: raceCourses.name,
                    surfaceType: raceCourses.surfaceType,
                    distanceMeters: courseDistances.distanceMeters,
                    raceStatus: races.status,
                    laneNumber: raceEntries.laneNumber,
                    entryStatus: raceEntries.entryStatus,
                    finishedPosition: raceResultEntries.finishedPosition,
                    finishTime: raceResultEntries.finishTime,
                    finishStatus: raceResultEntries.finishStatus,
                    points: raceResultEntries.points,
                    horse: {
                        id: horses.id,
                        name: horses.name,
                    },
                })
                .from(raceResultEntries)
                .innerJoin(
                    raceEntries,
                    eq(raceResultEntries.entryId, raceEntries.id),
                )
                .innerJoin(users, eq(raceEntries.jockeyId, users.id))
                .innerJoin(horses, eq(raceEntries.horseId, horses.id))
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
                .where(conditions)
                .orderBy(desc(races.scheduleAt))
                .limit(l)
                .offset(offset),

            db
                .select({ count: sql<number>`count(*)` })
                .from(raceResultEntries)
                .innerJoin(
                    raceEntries,
                    eq(raceResultEntries.entryId, raceEntries.id),
                )
                .innerJoin(users, eq(raceEntries.jockeyId, users.id))
                .innerJoin(races, eq(raceResultEntries.raceId, races.id))
                .innerJoin(
                    raceResults,
                    eq(raceResultEntries.resultId, raceResults.id),
                )
                .where(conditions),

            db
                .select({
                    totalRaces: sql<number>`count(*)`,
                    wins: sql<number>`count(*) FILTER (WHERE ${raceResultEntries.finishedPosition} = 1)`,
                    places: sql<number>`count(*) FILTER (WHERE ${raceResultEntries.finishedPosition} IN (2, 3))`,
                    avgFinishPosition: sql<number>`round(avg(${raceResultEntries.finishedPosition})::numeric, 2)`,
                    dnfCount: sql<number>`count(*) FILTER (WHERE ${raceResultEntries.finishStatus} = 'dnf')`,
                    dsqCount: sql<number>`count(*) FILTER (WHERE ${raceResultEntries.finishStatus} = 'dsq')`,
                })
                .from(raceResultEntries)
                .innerJoin(
                    raceEntries,
                    eq(raceResultEntries.entryId, raceEntries.id),
                )
                .innerJoin(users, eq(raceEntries.jockeyId, users.id))
                .innerJoin(races, eq(raceResultEntries.raceId, races.id))
                .innerJoin(
                    raceResults,
                    eq(raceResultEntries.resultId, raceResults.id),
                )
                .where(conditions),
        ]);

        const stats = statsArr[0] ?? {
            totalRaces: 0,
            wins: 0,
            places: 0,
            avgFinishPosition: null,
            dnfCount: 0,
            dsqCount: 0,
        };

        res.json({
            stats: {
                totalRaces: Number(stats.totalRaces),
                wins: Number(stats.wins),
                places: Number(stats.places),
                avgFinishPosition: stats.avgFinishPosition
                    ? Number(stats.avgFinishPosition)
                    : null,
                dnfCount: Number(stats.dnfCount),
                dsqCount: Number(stats.dsqCount),
            },
            ...paginatedResponse(
                data,
                Number(countArr[0]?.count ?? 0),
                p,
                l,
            ),
        });
    } catch (err) {
        next(err);
    }
};
