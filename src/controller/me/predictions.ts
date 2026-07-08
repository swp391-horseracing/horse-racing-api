import { NextFunction, Request, Response } from "express";
import db from "../../config/db.js";
import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { predictions } from "../../schema/predictions.js";
import { raceEntries } from "../../schema/raceEntries.js";
import { races } from "../../schema/races.js";
import { courseDistances } from "../../schema/courseDistances.js";
import { raceCourses } from "../../schema/raceCourses.js";
import { horses } from "../../schema/horses.js";
import { predictionsQuerySchema } from "../../validator/prediction.js";
import { getPagination, paginatedResponse } from "../../utils/paginate.js";

export const getMyPredictions = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;

        const parsed = predictionsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { search, status, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const re = alias(raceEntries, "re");
        const h = alias(horses, "h");

        const conditions = and(
            eq(predictions.spectatorId, user.id),
            search ? ilike(races.name, `%${search}%`) : undefined,
            status === "pending"
                ? isNull(predictions.isCorrect)
                : status === "correct"
                  ? eq(predictions.isCorrect, true)
                  : status === "incorrect"
                    ? eq(predictions.isCorrect, false)
                    : undefined,
        );

        const [data, count] = await Promise.all([
            db
                .select({
                    id: predictions.id,
                    race: {
                        id: races.id,
                        name: races.name,
                        distanceMeters: courseDistances.distanceMeters,
                        scheduledAt: races.scheduleAt,
                        venue: raceCourses.name,
                        status: races.status,
                    },
                    predictedEntry: {
                        entryId: predictions.predictedEntryId,
                        horseName: h.name,
                        baseSpeed: h.baseSpeed,
                        stamina: h.stamina,
                    },
                    predictedPosition: predictions.predictedPosition,
                    placedAt: predictions.placedAt,
                    isCorrect: predictions.isCorrect,
                    rewardAmount: predictions.rewardAmount,
                })
                .from(predictions)
                .innerJoin(races, eq(predictions.raceId, races.id))
                .innerJoin(re, eq(predictions.predictedEntryId, re.id))
                .innerJoin(h, eq(re.horseId, h.id))
                .leftJoin(
                    courseDistances,
                    eq(races.courseDistanceId, courseDistances.id),
                )
                .leftJoin(
                    raceCourses,
                    eq(courseDistances.courseId, raceCourses.id),
                )
                .where(conditions)
                .limit(l)
                .offset(offset)
                .orderBy(desc(predictions.placedAt)),
            db
                .select({ count: sql<number>`count(*)` })
                .from(predictions)
                .innerJoin(races, eq(predictions.raceId, races.id))
                .where(conditions),
        ]);

        return res.json(
            paginatedResponse(data, Number(count[0]?.count ?? 0), p, l),
        );
    } catch (err) {
        next(err);
    }
};
