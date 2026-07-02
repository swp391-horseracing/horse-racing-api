import { NextFunction, Request, Response } from "express";
import db from "../../config/db.js";
import { and, eq, sql, desc } from "drizzle-orm";
import { raceEntries } from "../../schema/raceEntries.js";
import { races } from "../../schema/races.js";
import { horses } from "../../schema/horses.js";
import { users } from "../../schema/users.js";
import { courseDistances } from "../../schema/courseDistances.js";
import { raceCourses } from "../../schema/raceCourses.js";
import { tournaments } from "../../schema/tournament.js";
import { jockeyInvitations } from "../../schema/jockeyInvitations.js";
import { myResultsQuerySchema } from "../../validator/tournament.js";
import { getPagination, paginatedResponse } from "../../utils/paginate.js";

export const getMyEntries = async (
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

        const conditions: ReturnType<typeof eq>[] = [
            eq(horses.ownerId, user.id),
        ];
        if (status)
            conditions.push(
                eq(races.status, status as typeof races.$inferSelect.status),
            );

        const whereCondition = and(...conditions);

        const [data, countArr, invitationCounts] = await Promise.all([
            db
                .select({
                    entryId: raceEntries.id,
                    raceId: races.id,
                    raceName: races.name,
                    scheduleAt: races.scheduleAt,
                    raceStatus: races.status,
                    tournamentId: tournaments.id,
                    tournamentName: tournaments.name,
                    horseId: horses.id,
                    horseName: horses.name,
                    weightKg: horses.weightKg,
                    jockeyId: raceEntries.jockeyId,
                    jockeyName: users.fullName,
                    laneNumber: raceEntries.laneNumber,
                    entryStatus: raceEntries.entryStatus,
                    confirmedAt: raceEntries.confirmedAt,
                    venue: raceCourses.name,
                    distanceMeters: courseDistances.distanceMeters,
                })
                .from(raceEntries)
                .innerJoin(races, eq(raceEntries.raceId, races.id))
                .innerJoin(tournaments, eq(races.tournamentId, tournaments.id))
                .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                .leftJoin(users, eq(raceEntries.jockeyId, users.id))
                .leftJoin(
                    courseDistances,
                    eq(races.courseDistanceId, courseDistances.id),
                )
                .leftJoin(
                    raceCourses,
                    eq(courseDistances.courseId, raceCourses.id),
                )
                .where(whereCondition)
                .limit(l)
                .offset(offset)
                .orderBy(desc(races.scheduleAt)),

            db
                .select({ count: sql<number>`count(*)` })
                .from(raceEntries)
                .innerJoin(races, eq(raceEntries.raceId, races.id))
                .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                .where(whereCondition),

            db
                .select({
                    raceId: jockeyInvitations.raceId,
                    horseId: jockeyInvitations.horseId,
                    pendingCount: sql<number>`count(*) filter (where ${jockeyInvitations.status} = 'pending')`,
                    responsesCount: sql<number>`count(*) filter (where ${jockeyInvitations.status} != 'pending')`,
                })
                .from(jockeyInvitations)
                .where(eq(jockeyInvitations.ownerId, user.id))
                .groupBy(jockeyInvitations.raceId, jockeyInvitations.horseId),
        ]);

        const countMap = new Map<
            string,
            { pending: number; responses: number }
        >();
        for (const c of invitationCounts) {
            countMap.set(`${c.raceId}:${c.horseId}`, {
                pending: Number(c.pendingCount),
                responses: Number(c.responsesCount),
            });
        }

        const enriched = data.map((entry) => {
            const counts = countMap.get(`${entry.raceId}:${entry.horseId}`);
            return {
                ...entry,
                pendingCount: counts?.pending ?? 0,
                responsesCount: counts?.responses ?? 0,
            };
        });

        return res.json(
            paginatedResponse(enriched, Number(countArr[0]?.count ?? 0), p, l),
        );
    } catch (err) {
        next(err);
    }
};
