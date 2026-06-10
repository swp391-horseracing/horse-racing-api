import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
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
        const { role, status, search, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions = and(
            search ? ilike(users.fullName, `%${search}%`) : undefined,
            role ? eq(users.role, role) : undefined,
            status ? eq(users.status, status) : undefined,
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

export const getUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.params.userId as string;
        if (!uuidValidate(userId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [user] = await db
            .select({
                id: users.id,
                fullName: users.fullName,
                email: users.email,
                phone: users.phone,
                address: users.address,
                avatarUrl: users.avatar_url,
                role: users.role,
                status: users.status,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .where(eq(users.id, userId));

        if (!user) {
            return res.status(404).json({ message: "User not exist" });
        }

        res.json(user);
    } catch (err) {
        next(err);
    }
};

export const updateUserRole = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.params.userId as string;
        const role = req.body.role;

        if (!uuidValidate(userId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const user = await db
            .update(users)
            .set({ role: role })
            .where(eq(users.id, userId))
            .returning();

        if (user.length === 0) {
            return res.status(404).json({ message: "User not exist" });
        }

        res.json({ message: "Role updated", userId: user[0]?.id });
    } catch (err) {
        next(err);
    }
};
