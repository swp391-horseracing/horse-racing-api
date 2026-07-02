import { NextFunction, Request, Response } from "express";
import { jockeyQuerySchema } from "../validator/jockey.js";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import { and, eq, ilike, ne, sql } from "drizzle-orm";
import { users } from "../schema/users.js";
import { raceEntries } from "../schema/raceEntries.js";
import { races } from "../schema/races.js";
import { jockeyProfile } from "../schema/jockeyProfile.js";
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
