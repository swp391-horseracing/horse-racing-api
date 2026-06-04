import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import config from "../config/config.js";
import db from "../config/db.js";
import { users } from "../schema/users.js";
import { Role } from "../types/roles.js";

function isValidRole(role: string): role is Role {
    return Object.values(Role).includes(role as Role);
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token ?? "", config().JWT_SECRET);

        if (
            typeof decoded !== "object" ||
            typeof decoded.id !== "string" ||
            typeof decoded.role !== "string" ||
            typeof decoded.tokenVersion !== "number"
        ) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        if (!isValidRole(decoded.role)) {
            return res.status(403).json({ message: "Invalid Role" });
        }

        const payload = decoded as Express.User;

        const [user] = await db
            .select({ token_version: users.token_version })
            .from(users)
            .where(eq(users.id, payload.id));

        if (!user || user.token_version !== payload.tokenVersion) {
            return res
                .status(401)
                .json({ message: "Token has been invalidated" });
        }

        req.user = payload;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token", err: err });
    }
};
