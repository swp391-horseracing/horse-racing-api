import bcrypt from "bcryptjs";
import db from "../../config/db.js";
import { users } from "../schema/user.js";

/** @type {import('express').RequestHandler} */
export const register = async (req, res, next) => {
    try {
        const { full_name, email, password, role } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const [user] = await db
            .insert(users)
            .values({ full_name, email, password: hashPassword, role })
            .returning({ id: users.id });

        res.status(201).json({ message: "Account created", user });
    } catch (err) {
        if (err.cause.code == "23505") {
            return res.status(409).json({ message: "Email already in use" });
        }
        next(err);
    }
};
