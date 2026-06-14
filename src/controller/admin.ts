import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import {
    tournamentReadinessSchema,
    usersQuerySchema,
} from "../validator/admin.js";
import { users } from "../schema/users.js";
import { and, eq, ilike, sql } from "drizzle-orm";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import db from "../config/db.js";
import { tournaments } from "../schema/tournament.js";

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
        const currUser = req.user;
        const role = req.body.role;

        if (!uuidValidate(userId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        if (currUser?.id === userId) {
            return res
                .status(403)
                .json({ message: "Cannot change your own role" });
        }

        const [userRole] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, userId));

        if (role == userRole?.role) {
            return res
                .status(403)
                .json({ message: "Role already set to this user" });
        }

        const updatedUser = await db
            .update(users)
            .set({ role: role })
            .where(eq(users.id, userId))
            .returning();

        if (updatedUser.length === 0) {
            return res.status(404).json({ message: "User not exist" });
        }

        res.json({ message: "Role updated", userId: updatedUser[0]?.id });
    } catch (err) {
        next(err);
    }
};

export const updateUserStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
        pending: ["active", "locked"],
        active: ["locked"],
        locked: ["active"],
    };
    try {
        const userId = req.params.userId as string;
        const status = req.body.status;

        if (!uuidValidate(userId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [user] = await db
            .select({ id: users.id, status: users.status })
            .from(users)
            .where(eq(users.id, userId));

        if (!user) {
            return res.status(404).json({ message: "User not exist" });
        }

        const allowed = ALLOWED_TRANSITIONS[user.status] ?? [];
        if (!allowed.includes(status)) {
            return res.status(403).json({
                message: `Cannot transition from '${user.status}' to '${status}'`,
            });
        }

        const [updatedUser] = await db
            .update(users)
            .set({ status: status })
            .where(eq(users.id, userId))
            .returning();

        res.json({ message: "Updated user status", userId: updatedUser?.id });
    } catch (err) {
        next(err);
    }
};

export const createTournament = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const admin = req.user!;
        const {
            name,
            startDate,
            endDate,
            description,
            rules,
            location,
            registrationOpenDate,
            registrationCloseDate,
            maximumParticipants,
            minimumParticipants,
            prizePool,
        } = req.body;

        const [newTournament] = await db
            .insert(tournaments)
            .values({
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                createdBy: admin?.id,
                description: description ?? null,
                rules: rules ?? null,
                location: location ?? null,
                registrationOpenDate: registrationOpenDate ?? null,
                registrationCloseDate: registrationCloseDate ?? null,
                maximumParticipants: maximumParticipants ?? null,
                minimumParticipants: minimumParticipants ?? null,
                prizePool: prizePool ?? null,
            })
            .returning();

        res.json(newTournament);
    } catch (err) {
        next(err);
    }
};

export const updateTournament = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const tournamentId = req.params.tournamentId as string;
        if (!uuidValidate(tournamentId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const body = req.body;
        const [updatedTournament] = await db
            .update(tournaments)
            .set({
                ...body,
                updatedAt: new Date(),
            })
            .where(eq(tournaments.id, tournamentId))
            .returning();

        if (!updatedTournament) {
            res.status(404).json({ message: "Tournament not found" });
        }

        res.json(updatedTournament);
    } catch (err) {
        next(err);
    }
};

export const updateTournamentStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const ALLOWED_TRANSITIONS: Record<string, string[]> = {
            draft: ["upcoming"],
            upcoming: ["registration_open", "cancelled"],
            registration_open: ["registration_closed", "cancelled"],
            registration_closed: ["ongoing", "cancelled"],
            ongoing: ["completed", "cancelled"],
        };
        const tournamentId = req.params.tournamentId as string;
        if (!uuidValidate(tournamentId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const status = req.body.status;

        const [tournament] = await db
            .select()
            .from(tournaments)
            .where(eq(tournaments.id, tournamentId));

        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        if (status === "upcoming") {
            const validation = tournamentReadinessSchema.safeParse(tournament);
            if (!validation.success) {
                const missing = validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                }));
                return res.status(400).json({
                    message: "Tournament is missing required field",
                    fields: missing,
                });
            }
        }
        const allowed = ALLOWED_TRANSITIONS[tournament.status] ?? [];
        if (!allowed.includes(status)) {
            return res.status(403).json({
                message: `Cannot transition from '${tournament.status}' to '${status}'`,
            });
        }
        const [updatedTournament] = await db
            .update(tournaments)
            .set({ status: status })
            .where(eq(tournaments.id, tournamentId))
            .returning();

        res.json(updatedTournament);
    } catch (err) {
        next(err);
    }
};
