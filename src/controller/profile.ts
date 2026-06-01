import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import db from "../config/db.js";
import { users } from "../schema/users.js";

export const getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.params.id as string;
        const requester = req.user!;

        if (requester.id !== id && requester.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const [user] = await db
            .select({
                id: users.id,
                full_name: users.fullName,
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
        const id = req.params.id as string;

        if (req.user!.id !== id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const { full_name, email, password, phone, address, avatar_url } =
            req.body;

        if (
            full_name === undefined &&
            email === undefined &&
            password === undefined &&
            phone === undefined &&
            address === undefined &&
            avatar_url === undefined
        ) {
            return res.status(400).json({ message: "No fields to update" });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const set: Record<string, any> = {};

        if (full_name !== undefined) set.fullName = full_name;
        if (email !== undefined) set.email = email;
        if (password !== undefined) {
            const salt = await bcrypt.genSalt(10);
            set.password = await bcrypt.hash(password, salt);
        }
        if (phone !== undefined) set.phone = phone;
        if (address !== undefined) set.address = address;
        if (avatar_url !== undefined) set.avatar_url = avatar_url;

        const credentialsChanged = email !== undefined || password !== undefined;
        if (credentialsChanged) {
            set.token_version = sql`${users.token_version} + 1`;
        }

        set.updatedAt = new Date();

        const [updated] = await db
            .update(users)
            .set(set)
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                full_name: users.fullName,
                email: users.email,
                role: users.role,
                status: users.status,
                token_version: users.token_version,
            });

        if (!updated) {
            return res.status(404).json({ message: "User not found" });
        }

        const response: Record<string, unknown> = {
            message: "Profile updated",
            user: {
                id: updated.id,
                full_name: updated.full_name,
                email: updated.email,
                role: updated.role,
                status: updated.status,
            },
        };

        if (credentialsChanged) {
            response.token = jwt.sign(
                {
                    id: updated.id,
                    email: updated.email,
                    role: updated.role,
                    tokenVersion: updated.token_version,
                },
                config().JWT_SECRET,
                { expiresIn: config().JWT_EXPIRES_IN } as jwt.SignOptions,
            );
        }

        res.json(response);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err?.cause?.code === "23505") {
            return res.status(409).json({ message: "Email already in use" });
        }
        next(err);
    }
};
