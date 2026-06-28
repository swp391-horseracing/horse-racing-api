import { NextFunction, Request, Response } from "express";
import db from "../../config/db.js";
import { users } from "../../schema/users.js";
import { eq } from "drizzle-orm";
import { jockeyProfile } from "../../schema/jockeyProfile.js";

const getJockeyUser = async (userId: string) => {
    const [result] = await db
        .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            phone: users.phone,
            address: users.address,
            avatarUrl: users.avatar_url,
            role: users.role,
            status: users.status,
            weightKg: jockeyProfile.weightKg,
            experienceYear: jockeyProfile.experienceYear,
        })
        .from(users)
        .leftJoin(jockeyProfile, eq(jockeyProfile.userId, userId))
        .where(eq(users.id, userId));

    if (!result) {
        return null;
    }

    return result;
};

const getRegularUser = async (userId: string) => {
    const [result] = await db
        .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            phone: users.phone,
            address: users.address,
            avatarUrl: users.avatar_url,
            role: users.role,
            status: users.status,
        })
        .from(users)
        .where(eq(users.id, userId));

    if (!result) {
        return null;
    }

    return result;
};

export const getMeProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userProfile =
            req.user?.role === "jockey"
                ? await getJockeyUser(user.id)
                : await getRegularUser(user.id);

        res.json(userProfile);
    } catch (err) {
        next(err);
    }
};
