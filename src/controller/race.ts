import { NextFunction, Request, Response } from "express";
import db from "../config/db.js";
import { races } from "../schema/races.js";
import { validate as uuidValidate } from "uuid";
import { eq, ne, and, sql, inArray, count, asc, desc } from "drizzle-orm";
import { raceEntries } from "../schema/raceEntries.js";
import { horses } from "../schema/horses.js";
import { users } from "../schema/users.js";
import { predictions } from "../schema/predictions.js";
import { courseDistances } from "../schema/courseDistances.js";
import { raceCourses } from "../schema/raceCourses.js";
import { createPredictionSchema } from "../validator/prediction.js";
import { listRacesQuerySchema } from "../validator/race.js";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { raceResults } from "../schema/raceResults.js";
import { raceConfigs } from "../schema/raceConfig.js";
import { wallets } from "../schema/wallets.js";
import { walletTransactions } from "../schema/walletTransaction.js";
import { ensureWallet } from "./me/wallet.js";
import { paginatedResponse } from "../utils/paginate.js";

export const listRaces = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const parsed = listRacesQuerySchema.safeParse(req.query);

        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { status, sort, order, page, limit } = parsed.data;
        const offset = (page! - 1) * limit!;

        const conditions: Parameters<typeof and>[number][] = [];

        if (status) {
            const statuses = status.split(",").filter(Boolean);
            conditions.push(
                inArray(
                    races.status,
                    statuses as (typeof races.status.enumValues)[number][],
                ),
            );
        } else {
            conditions.push(ne(races.status, "draft"));
        }

        const whereClause = and(...conditions);

        const sortColumn =
            sort === "name"
                ? races.name
                : sort === "createdAt"
                  ? races.createdAt
                  : sort === "status"
                    ? races.status
                    : sort === "raceNumber"
                      ? races.raceNumber
                      : races.scheduleAt;

        const orderByClause =
            order === "desc" ? desc(sortColumn) : asc(sortColumn);

        const [countResult] = await db
            .select({ count: count() })
            .from(races)
            .where(whereClause);

        const total = countResult ? Number(countResult.count) : 0;

        const raceList = await db
            .select({
                id: races.id,
                tournamentId: races.tournamentId,
                name: races.name,
                raceNumber: races.raceNumber,
                scheduledAt: races.scheduleAt,
                laneCount: races.laneCount,
                status: races.status,
                venue: raceCourses.name,
            })
            .from(races)
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit!)
            .offset(offset);

        res.json(paginatedResponse(raceList, total, page!, limit!));
    } catch (err) {
        next(err);
    }
};

export const getRace = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const userRole = req.user?.role;
        const [race] = await db
            .select({
                id: races.id,
                tournamentId: races.tournamentId,
                courseDistanceId: races.courseDistanceId,
                name: races.name,
                raceNumber: races.raceNumber,
                scheduledAt: races.scheduleAt,
                laneCount: races.laneCount,
                status: races.status,
                createdAt: races.createdAt,
                updatedAt: races.updatedAt,
                avaiableSlots: sql<number>`${races.laneCount} - (select count(*) from ${raceEntries} where ${raceEntries.raceId} = ${races.id})`,
                course: {
                    id: raceCourses.id,
                    name: raceCourses.name,
                    country: raceCourses.country,
                    city: raceCourses.city,
                    surfaceType: raceCourses.surfaceType,
                    distanceMeters: courseDistances.distanceMeters,
                },
            })
            .from(races)
            .leftJoin(
                courseDistances,
                eq(races.courseDistanceId, courseDistances.id),
            )
            .leftJoin(raceCourses, eq(courseDistances.courseId, raceCourses.id))
            .where(
                userRole === "admin"
                    ? eq(races.id, raceId)
                    : and(eq(races.id, raceId), ne(races.status, "draft")),
            );

        if (!race) {
            return res.status(404).json({ message: "Race not exist" });
        }

        res.json(race);
    } catch (err) {
        next(err);
    }
};

export const getHorseEntries = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const userRole = req.user?.role;
        const [race] = await db
            .select()
            .from(races)
            .where(
                userRole === "admin"
                    ? eq(races.id, raceId)
                    : and(eq(races.id, raceId), ne(races.status, "draft")),
            );

        if (!race) {
            return res.status(404).json({ message: "Race not exist" });
        }

        const horseEntries = await db
            .select({
                id: horses.id,
                jockeyId: users.id,
                jockeyName: users.fullName,
                name: horses.name,
                breed: horses.breed,
                weightKg: horses.weightKg,
                baseSpeed: horses.baseSpeed,
                stamina: horses.stamina,
                entryStatus: raceEntries.entryStatus,
                laneNumber: raceEntries.laneNumber,
            })
            .from(races)
            .where(eq(races.id, raceId))
            .innerJoin(raceEntries, eq(races.id, raceEntries.raceId))
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .leftJoin(users, eq(raceEntries.jockeyId, users.id));

        res.json(horseEntries);
    } catch (err) {
        next(err);
    }
};

export const getRaceEntries = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const userRole = req.user?.role;
        const [race] = await db
            .select()
            .from(races)
            .where(
                userRole === "admin"
                    ? eq(races.id, raceId)
                    : and(eq(races.id, raceId), ne(races.status, "draft")),
            );

        if (!race) {
            return res.status(404).json({ message: "Race not found" });
        }

        const entries = await db
            .select({
                entryId: raceEntries.id,
                laneNumber: raceEntries.laneNumber,
                entryStatus: raceEntries.entryStatus,
                horse: {
                    id: horses.id,
                    name: horses.name,
                    breed: horses.breed,
                    baseSpeed: horses.baseSpeed,
                    stamina: horses.stamina,
                },
                jockey: {
                    id: users.id,
                    name: users.fullName,
                },
            })
            .from(raceEntries)
            .innerJoin(horses, eq(raceEntries.horseId, horses.id))
            .leftJoin(users, eq(raceEntries.jockeyId, users.id))
            .where(eq(raceEntries.raceId, raceId))
            .orderBy(raceEntries.laneNumber);

        res.json(entries);
    } catch (err) {
        next(err);
    }
};

export const createPrediction = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user!;
        const raceId = req.params.raceId as string;

        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const parsed = createPredictionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { predictedEntryId, predictedPosition, stakeAmount } =
            parsed.data;

        const [race] = await db
            .select({
                id: races.id,
                status: races.status,
            })
            .from(races)
            .where(eq(races.id, raceId));

        if (!race) {
            return res.status(404).json({ message: "Race not found" });
        }

        if (!["scheduled", "pre_race"].includes(race.status)) {
            return res.status(400).json({
                message:
                    "Predictions can only be placed on scheduled or pre-race races",
            });
        }

        const [config] = await db
            .select({
                enabled: raceConfigs.predictionsEnabled,
                minStake: raceConfigs.predictionMinStake,
            })
            .from(raceConfigs)
            .where(eq(raceConfigs.raceId, raceId));

        if (config && !config.enabled) {
            return res.status(400).json({
                message: "Predictions are disabled for this race",
            });
        }

        const minStake = config?.minStake ?? 50;
        if (stakeAmount < minStake) {
            return res.status(400).json({
                message: `Minimum stake for this race is ${minStake} points`,
            });
        }

        const [entry] = await db
            .select({ id: raceEntries.id })
            .from(raceEntries)
            .where(
                and(
                    eq(raceEntries.raceId, raceId),
                    eq(raceEntries.id, predictedEntryId),
                ),
            );

        if (!entry) {
            return res.status(400).json({
                message: "Predicted entry does not exist in this race",
            });
        }

        const wallet = await ensureWallet(user.id);

        const [prediction] = await db.transaction(async (tx) => {
            const [locked] = await tx
                .select({ id: wallets.id, balance: wallets.balance })
                .from(wallets)
                .where(eq(wallets.id, wallet.id))
                .for("update");

            if (!locked || locked.balance < stakeAmount) {
                throw new InsufficientBalanceError();
            }

            const [updatedWallet] = await tx
                .update(wallets)
                .set({
                    balance: sql`${wallets.balance} - ${stakeAmount}`,
                    updatedAt: new Date(),
                })
                .where(eq(wallets.id, wallet.id))
                .returning({ balance: wallets.balance });

            await tx.insert(walletTransactions).values({
                walletId: wallet.id,
                type: "prediction",
                status: "completed",
                amount: -stakeAmount,
                balanceBefore: locked.balance,
                balanceAfter: updatedWallet!.balance,
                referenceId: raceId,
                description: `Prediction stake for race ${raceId}`,
            });

            return tx
                .insert(predictions)
                .values({
                    spectatorId: user.id,
                    raceId,
                    predictedEntryId,
                    predictedPosition,
                    stakeAmount,
                })
                .returning();
        });

        return res.status(201).json({ prediction });
    } catch (err: unknown) {
        if (err instanceof InsufficientBalanceError) {
            return res
                .status(400)
                .json({ message: "Insufficient wallet balance" });
        }
        if (
            err &&
            typeof err === "object" &&
            "cause" in err &&
            typeof (err as { cause?: { code?: string } }).cause?.code ===
                "string" &&
            (err as { cause: { code: string } }).cause.code === "23505"
        ) {
            return res
                .status(409)
                .json({ message: "You have already predicted this race" });
        }
        next(err);
    }
};

class InsufficientBalanceError extends Error {
    constructor() {
        super("Insufficient balance");
        this.name = "InsufficientBalanceError";
    }
}

export const getRaceResult = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const raceId = req.params.raceId as string;
        if (!uuidValidate(raceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const result = await db
            .select({
                id: raceResultEntries.id,
                raceId: raceResultEntries.raceId,
                jockeyId: users.id,
                jockeyName: users.fullName,
                horseId: horses.id,
                horseName: horses.name,
                finishedPosition: raceResultEntries.finishedPosition,
                finishTime: raceResultEntries.finishTime,
                finishStatus: raceResultEntries.finishStatus,
                points: raceResultEntries.points,
            })
            .from(raceResultEntries)
            .innerJoin(
                raceResults,
                eq(raceResultEntries.resultId, raceResults.id),
            )
            .leftJoin(
                raceEntries,
                eq(raceEntries.id, raceResultEntries.entryId),
            )
            .leftJoin(users, eq(raceEntries.jockeyId, users.id))
            .leftJoin(horses, eq(raceEntries.horseId, horses.id))
            .where(
                and(
                    eq(raceResultEntries.raceId, raceId),
                    eq(raceResults.resultStatus, "published"),
                ),
            )
            .orderBy(raceResultEntries.finishedPosition, raceResultEntries.id);

        if (result.length === 0) {
            return res
                .status(404)
                .json({ message: "Results not yet available" });
        }
        res.json(result);
    } catch (err) {
        next(err);
    }
};
