import { NextFunction, Request, Response } from "express";
import { usersQuerySchema } from "../validator/admin.js";
import { users } from "../schema/users.js";
import { and, eq, ilike, sql } from "drizzle-orm";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import db from "../config/db.js";

export const getUsers = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const parsed = usersQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }
        const { role, search, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions = and(
            search ? ilike(users.fullName, `%${search}%`) : undefined,
            role ? eq(users.role, role) : undefined,
        );

        const [data, count] = await Promise.all([
            db
                .select({
                    id: users.id,
                    fullName: users.fullName,
                    email: users.email,
                    role: users.role,
                    status: users.status,
                    createdAt: users.createdAt,
                    avatarUrl: users.avatar_url,
                })
                .from(users)
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
