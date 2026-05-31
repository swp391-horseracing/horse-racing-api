import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import db from "../config/db.js";
import { users } from "../schema/user.js";

export const getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { id } = req.params;

        const [user] = await db
            .select({
                id: users.id,
                full_name: users.full_name,
                email: users.email,
                phone: users.phone,
                address: users.address,
                avatar_url: users.avatar_url,
                role: users.role,
                status: users.status,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .where(eq(users.id, id));

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ user });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        next(err);
    }
};

export const updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { id } = req.params;

        if (req.user!.id !== id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const { full_name, email, password, phone, address, avatar_url } =
            req.body;

        const set: Partial<typeof users.$inferInsert> & {
            token_version?: ReturnType<typeof sql>;
        } = {};

        if (full_name !== undefined) set.full_name = full_name;
        if (email !== undefined) set.email = email;
        if (password !== undefined) {
            const salt = await bcrypt.genSalt(10);
            set.password = await bcrypt.hash(password, salt);
        }
        if (phone !== undefined) set.phone = phone;
        if (address !== undefined) set.address = address;
        if (avatar_url !== undefined) set.avatar_url = avatar_url;

        if (email !== undefined || password !== undefined) {
            set.token_version = sql`${users.token_version} + 1`;
        }

        set.updatedAt = new Date();

        const [updated] = await db
            .update(users)
            .set(set)
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                full_name: users.full_name,
                email: users.email,
                role: users.role,
                status: users.status,
            });

        if (!updated) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "Profile updated", user: updated });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err?.cause?.code === "23505") {
            return res.status(409).json({ message: "Email already in use" });
        }
        next(err);
    }
};
