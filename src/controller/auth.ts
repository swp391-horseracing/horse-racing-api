import bcrypt from "bcryptjs";
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
