import { NextFunction, Request, Response } from "express";
import db from "../../config/db.js";
import { and, eq, sql } from "drizzle-orm";
import { tournamentRegistrations } from "../../schema/tournamentRegistrations.js";
import { tournaments } from "../../schema/tournament.js";
import { horses } from "../../schema/horses.js";
import { myRegistrationsQuerySchema } from "../../validator/tournament.js";
import { getPagination, paginatedResponse } from "../../utils/paginate.js";

export const getMyRegistrations = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;

        const parsed = myRegistrationsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        const { status, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const condition = and(
            eq(tournamentRegistrations.ownerId, user.id),
            status ? eq(tournamentRegistrations.status, status) : undefined,
        );

        const [registrations, count] = await Promise.all([
            db
                .select({
                    id: tournamentRegistrations.registrationId,
                    status: tournamentRegistrations.status,
                    submittedAt: tournamentRegistrations.submittedAt,
                    tournament: {
                        id: tournaments.id,
                        name: tournaments.name,
                        location: tournaments.location,
                        startDate: tournaments.startDate,
                        endDate: tournaments.endDate,
                        status: tournaments.status,
                    },
                    horse: {
                        id: horses.id,
                        name: horses.name,
                        breed: horses.breed,
                        baseSpeed: horses.baseSpeed,
                        stamina: horses.stamina,
                        acceleration: horses.acceleration,
                    },
                })
                .from(tournamentRegistrations)
                .innerJoin(
                    tournaments,
                    eq(tournamentRegistrations.tournamentId, tournaments.id),
                )
                .innerJoin(
                    horses,
                    eq(tournamentRegistrations.horseId, horses.id),
                )
                .where(condition)
                .limit(l)
                .offset(offset)
                .orderBy(tournamentRegistrations.submittedAt),
            db
                .select({ count: sql<number>`count(*)` })
                .from(tournamentRegistrations)
                .where(condition),
        ]);

        return res.json(
            paginatedResponse(
                registrations,
                Number(count[0]?.count ?? 0),
                p,
                l,
            ),
        );
    } catch (err) {
        next(err);
    }
};
