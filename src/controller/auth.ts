import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, sql } from "drizzle-orm";
import config from "../config/config.js";
import db from "../config/db.js";
import { users } from "../schema/users.js";
import { NextFunction, Request, Response } from "express";

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { fullName, email, password, role } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const [user] = await db
            .insert(users)
            .values({ fullName, email, password: hashPassword, role })
            .returning({ id: users.id });

        res.status(201).json({ message: "Account created", user });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err.cause.code == "23505") {
            return res.status(409).json({ message: "Email already in use" });
        }
        next(err);
    }
};

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { email, password } = req.body;

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (user.status === "locked") {
            return res.status(403).json({ message: "Account is locked" });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                tokenVersion: user.token_version,
            },
            config().JWT_SECRET,
            { expiresIn: config().JWT_EXPIRES_IN } as jwt.SignOptions,
        );

        res.json({
            token,
            user: {
                id: user.id,
                full_name: user.fullName,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        next(err);
    }
};

export const logout = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        await db
            .update(users)
            .set({ token_version: sql`${users.token_version} + 1` })
            .where(eq(users.id, req.user!.id));

        res.json({ message: "Logged out successfully" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        next(err);
    }
};
