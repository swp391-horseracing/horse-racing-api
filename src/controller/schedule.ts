import { NextFunction, Request, Response } from "express";
import db from "../config/db.js";
import { races, courseDistances, raceCourses } from "../schema/index.js";
import { and, eq, ne } from "drizzle-orm";
import moment from "moment";
import { sql } from "drizzle-orm";

export const getRaceSchedule = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { year, month } = req.query;

        const now = moment();
        const y = year ? Number(year) : now.year();
        const m = month ? Number(month) : now.month() + 1; // Need to add 1 here since month is 0-indexed

        if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
            return res.status(400).json({ message: "Invalid year or month" });
        }

        const startDate = moment(
            `${y}-${String(m).padStart(2, "0")}-01`,
        ).format();
        const endDate = moment(`${y}-${String(m).padStart(2, "0")}-01`)
            .add(1, "month")
            .format();

        const raceSchedule = await db
            .select({
                id: races.id,
                tournamentId: races.tournamentId,
                name: races.name,
                scheduledAt: races.scheduleAt,
                venue: raceCourses.name,
                status: races.status,
            })
            .from(races)
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(
                and(
                    sql`${races.scheduleAt} >= ${startDate} AND ${races.scheduleAt} < ${endDate}`,
                    ne(races.status, "draft"),
                ),
            );

        res.json(raceSchedule);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        next(err);
    }
};
