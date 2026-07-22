import { NextFunction, Request, Response } from "express";
import { eq, and, ilike, sql, gte, lte, desc } from "drizzle-orm";
import { validate as uuidValidate } from "uuid";
import db from "../config/db.js";
import { horses } from "../schema/horses.js";
import { races } from "../schema/races.js";
import { raceEntries } from "../schema/raceEntries.js";
import { raceResultEntries } from "../schema/raceResultEntries.js";
import { raceResults } from "../schema/raceResults.js";
import { users } from "../schema/users.js";
import { courseDistances } from "../schema/courseDistances.js";
import { raceCourses } from "../schema/raceCourses.js";
import { horsesQuerySchema } from "../validator/horse.js";
import { raceHistoryQuerySchema } from "../validator/race.js";
import { getPagination, paginatedResponse } from "../utils/paginate.js";
import { uploadFile, deleteFile, getSignedUrlByKey } from "../utils/s3.js";
import { randomHex } from "../utils/randomHex.js";

const isRacingSubquery = sql<boolean>`EXISTS(
  SELECT 1 FROM ${raceEntries} re
  INNER JOIN ${races} r ON r.id = re.race_id
  WHERE re.horse_id = "horses"."id"
  AND re.entry_status = 'confirmed'
  AND r.status IN ('scheduled', 'pre_race', 'ongoing', 'under_review')
)`;

export const getHorses = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const parsed = horsesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const {
            birthFrom,
            birthTo,
            search,
            breed,
            isRetired,
            isRacing,
            page,
            limit,
        } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions = and(
            search ? ilike(horses.name, `%${search}%`) : undefined,
            breed ? eq(horses.breed, breed) : undefined,
            isRetired ? eq(horses.isRetired, isRetired) : undefined,
            isRacing !== undefined ? eq(isRacingSubquery, isRacing) : undefined,
            birthFrom ? gte(horses.birthDate, birthFrom) : undefined,
            birthTo ? lte(horses.birthDate, birthTo) : undefined,
        );

        const [data, count] = await Promise.all([
            db
                .select({
                    id: horses.id,
                    ownerId: horses.ownerId,
                    name: horses.name,
                    breed: horses.breed,
                    birthDate: horses.birthDate,
                    weightKg: horses.weightKg,
                    imageUrl: horses.imageUrl,
                    healthStatus: horses.healthStatus,
                    isRetired: horses.isRetired,
                    baseSpeed: horses.baseSpeed,
                    stamina: horses.stamina,
                    createdAt: horses.createdAt,
                    updatedAt: horses.updatedAt,
                    isRacing: isRacingSubquery,
                })
                .from(horses)
                .where(conditions)
                .limit(l)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)` })
                .from(horses)
                .where(conditions),
        ]);

        const horsesWithUrls = await Promise.all(
            data.map(async (horse) => ({
                ...horse,
                imageUrl: horse.imageUrl
                    ? await getSignedUrlByKey(horse.imageUrl)
                    : null,
            })),
        );

        return res.json(
            paginatedResponse(
                horsesWithUrls,
                Number(count[0]?.count ?? 0),
                p,
                l,
            ),
        );
    } catch (err) {
        next(err);
    }
};

export const getOwnerHorses = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const ownerId = req.params.ownerId as string;
        if (!uuidValidate(ownerId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const parsed = horsesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { search, breed, isRetired, isRacing, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions = and(
            search ? ilike(horses.name, `%${search}%`) : undefined,
            breed ? eq(horses.breed, breed) : undefined,
            isRetired ? eq(horses.isRetired, isRetired) : undefined,
            isRacing !== undefined ? eq(isRacingSubquery, isRacing) : undefined,
            eq(horses.ownerId, ownerId),
        );

        const [data, count] = await Promise.all([
            db
                .select({
                    id: horses.id,
                    ownerId: horses.ownerId,
                    name: horses.name,
                    breed: horses.breed,
                    birthDate: horses.birthDate,
                    weightKg: horses.weightKg,
                    imageUrl: horses.imageUrl,
                    healthStatus: horses.healthStatus,
                    isRetired: horses.isRetired,
                    baseSpeed: horses.baseSpeed,
                    stamina: horses.stamina,
                    createdAt: horses.createdAt,
                    updatedAt: horses.updatedAt,
                    isRacing: isRacingSubquery,
                })
                .from(horses)
                .where(conditions)
                .limit(l)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)` })
                .from(horses)
                .where(conditions),
        ]);

        const horsesWithUrls = await Promise.all(
            data.map(async (horse) => ({
                ...horse,
                imageUrl: horse.imageUrl
                    ? await getSignedUrlByKey(horse.imageUrl)
                    : null,
            })),
        );

        return res.json(
            paginatedResponse(
                horsesWithUrls,
                Number(count[0]?.count ?? 0),
                p,
                l,
            ),
        );
    } catch (err) {
        next(err);
    }
};

export const getHorse = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.params.id as string;
        if (!uuidValidate(id)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [horse] = await db
            .select({
                id: horses.id,
                ownerId: horses.ownerId,
                name: horses.name,
                breed: horses.breed,
                birthDate: horses.birthDate,
                weightKg: horses.weightKg,
                imageUrl: horses.imageUrl,
                healthStatus: horses.healthStatus,
                isRetired: horses.isRetired,
                baseSpeed: horses.baseSpeed,
                stamina: horses.stamina,
                createdAt: horses.createdAt,
                updatedAt: horses.updatedAt,
                isRacing: isRacingSubquery,
            })
            .from(horses)
            .where(eq(horses.id, id));

        if (!horse) {
            return res.status(404).json({ message: "Horse not found" });
        }

        if (horse.imageUrl) {
            horse.imageUrl = await getSignedUrlByKey(horse.imageUrl);
        }

        res.json({ horse });
    } catch (err) {
        next(err);
    }
};

export const addHorse = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    let uploadedKey: string | null = null;

    try {
        const {
            name,
            breed,
            birthDate,
            weightKg,
            healthStatus,
            baseSpeed,
            stamina,
        } = req.body;

        let imageUrl: string | null = null;

        if (req.file) {
            const ext = req.file.mimetype.split("/")[1];
            const key = `horses/${crypto.randomUUID()}/${randomHex(16)}.${ext}`;
            try {
                await uploadFile(key, req.file);
            } catch (uploadErr) {
                console.error("S3 upload failed:", uploadErr);
                return res
                    .status(500)
                    .json({ message: "Failed to upload image" });
            }
            uploadedKey = key;
            imageUrl = key;
        }

        const [horse] = await db
            .insert(horses)
            .values({
                ownerId: req.user!.id,
                name,
                breed,
                birthDate: birthDate ?? null,
                weightKg: weightKg ?? null,
                imageUrl,
                healthStatus: healthStatus ?? null,
                isRetired: false,
                baseSpeed: baseSpeed ?? 0,
                stamina: stamina ?? 0,
            })
            .returning();

        if (horse?.imageUrl) {
            horse.imageUrl = await getSignedUrlByKey(horse.imageUrl);
        }

        res.status(201).json({ horse });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (uploadedKey) {
            try {
                await deleteFile(uploadedKey);
            } catch (deleteErr) {
                console.error("Failed to cleanup uploaded file:", deleteErr);
            }
        }
        if (err?.cause?.code === "23505") {
            return res
                .status(409)
                .json({ message: "Horse name already in use" });
        }
        next(err);
    }
};

export const updateHorse = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    let uploadedKey: string | null = null;

    try {
        const id = req.params.id as string;
        if (!uuidValidate(id)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [horse] = await db.select().from(horses).where(eq(horses.id, id));

        if (!horse) {
            return res.status(404).json({ message: "Horse not found" });
        }

        if (horse.ownerId !== req.user!.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (horse.isRetired) {
            return res
                .status(400)
                .json({ message: "Cannot update a retired horse" });
        }

        const {
            name,
            breed,
            birthDate,
            weightKg,
            healthStatus,
            baseSpeed,
            stamina,
        } = req.body;

        if (
            name === undefined &&
            breed === undefined &&
            birthDate === undefined &&
            weightKg === undefined &&
            healthStatus === undefined &&
            baseSpeed === undefined &&
            stamina === undefined &&
            !req.file
        ) {
            return res.status(400).json({ message: "No fields to update" });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {};
        if (name !== undefined) updates.name = name;
        if (breed !== undefined) updates.breed = breed;
        if (birthDate !== undefined) updates.birthDate = birthDate;
        if (weightKg !== undefined) updates.weightKg = weightKg;
        if (healthStatus !== undefined) updates.healthStatus = healthStatus;
        if (baseSpeed !== undefined) updates.baseSpeed = baseSpeed;
        if (stamina !== undefined) updates.stamina = stamina;

        if (req.file) {
            const ext = req.file.mimetype.split("/")[1];
            const key = `horses/${id}/${randomHex(16)}.${ext}`;
            try {
                await uploadFile(key, req.file);
            } catch (uploadErr) {
                console.error("S3 upload failed:", uploadErr);
                return res
                    .status(500)
                    .json({ message: "Failed to upload image" });
            }
            uploadedKey = key;
            updates.imageUrl = key;
        }

        const [updatedHorse] = await db
            .update(horses)
            .set(updates)
            .where(eq(horses.id, id))
            .returning();

        if (req.file && horse?.imageUrl) {
            await deleteFile(horse.imageUrl);
        }

        if (updatedHorse?.imageUrl) {
            updatedHorse.imageUrl = await getSignedUrlByKey(
                updatedHorse.imageUrl,
            );
        }

        res.json({ horse: updatedHorse });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (uploadedKey) {
            try {
                await deleteFile(uploadedKey);
            } catch (deleteErr) {
                console.error("Failed to cleanup uploaded file:", deleteErr);
            }
        }
        if (err?.cause?.code === "23505") {
            return res
                .status(409)
                .json({ message: "Horse name already in use" });
        }
        next(err);
    }
};

export const getHorseRaceHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.params.id as string;
        if (!uuidValidate(id)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const parsed = raceHistoryQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation error",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { page, limit, status } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions = and(
            eq(raceEntries.horseId, id),
            eq(raceResults.resultStatus, "published"),
            status ? eq(races.status, status) : undefined,
        );

        const [data, countArr, statsArr] = await Promise.all([
            db
                .select({
                    raceId: races.id,
                    raceName: races.name,
                    raceNumber: races.raceNumber,
                    scheduledAt: races.scheduleAt,
                    venue: raceCourses.name,
                    surfaceType: raceCourses.surfaceType,
                    distanceMeters: courseDistances.distanceMeters,
                    raceStatus: races.status,
                    laneNumber: raceEntries.laneNumber,
                    entryStatus: raceEntries.entryStatus,
                    finishedPosition: raceResultEntries.finishedPosition,
                    finishTime: raceResultEntries.finishTime,
                    finishStatus: raceResultEntries.finishStatus,
                    points: raceResultEntries.points,
                    jockey: {
                        id: users.id,
                        fullName: users.fullName,
                    },
                })
                .from(raceResultEntries)
                .innerJoin(
                    raceEntries,
                    eq(raceResultEntries.entryId, raceEntries.id),
                )
                .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                .leftJoin(users, eq(raceEntries.jockeyId, users.id))
                .innerJoin(races, eq(raceResultEntries.raceId, races.id))
                .innerJoin(
                    raceResults,
                    eq(raceResultEntries.resultId, raceResults.id),
                )
                .leftJoin(
                    courseDistances,
                    eq(races.courseDistanceId, courseDistances.id),
                )
                .leftJoin(
                    raceCourses,
                    eq(courseDistances.courseId, raceCourses.id),
                )
                .where(conditions)
                .orderBy(desc(races.scheduleAt))
                .limit(l)
                .offset(offset),

            db
                .select({ count: sql<number>`count(*)` })
                .from(raceResultEntries)
                .innerJoin(
                    raceEntries,
                    eq(raceResultEntries.entryId, raceEntries.id),
                )
                .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                .innerJoin(races, eq(raceResultEntries.raceId, races.id))
                .innerJoin(
                    raceResults,
                    eq(raceResultEntries.resultId, raceResults.id),
                )
                .where(conditions),

            db
                .select({
                    totalRaces: sql<number>`count(*)`,
                    wins: sql<number>`count(*) FILTER (WHERE ${raceResultEntries.finishedPosition} = 1)`,
                    places: sql<number>`count(*) FILTER (WHERE ${raceResultEntries.finishedPosition} IN (2, 3))`,
                    avgFinishPosition: sql<number>`round(avg(${raceResultEntries.finishedPosition})::numeric, 2)`,
                    dnfCount: sql<number>`count(*) FILTER (WHERE ${raceResultEntries.finishStatus} = 'dnf')`,
                    dsqCount: sql<number>`count(*) FILTER (WHERE ${raceResultEntries.finishStatus} = 'dsq')`,
                })
                .from(raceResultEntries)
                .innerJoin(
                    raceEntries,
                    eq(raceResultEntries.entryId, raceEntries.id),
                )
                .innerJoin(horses, eq(raceEntries.horseId, horses.id))
                .innerJoin(races, eq(raceResultEntries.raceId, races.id))
                .innerJoin(
                    raceResults,
                    eq(raceResultEntries.resultId, raceResults.id),
                )
                .where(conditions),
        ]);

        const stats = statsArr[0] ?? {
            totalRaces: 0,
            wins: 0,
            places: 0,
            avgFinishPosition: null,
            dnfCount: 0,
            dsqCount: 0,
        };

        res.json({
            stats: {
                totalRaces: Number(stats.totalRaces),
                wins: Number(stats.wins),
                places: Number(stats.places),
                avgFinishPosition: stats.avgFinishPosition
                    ? Number(stats.avgFinishPosition)
                    : null,
                dnfCount: Number(stats.dnfCount),
                dsqCount: Number(stats.dsqCount),
            },
            ...paginatedResponse(data, Number(countArr[0]?.count ?? 0), p, l),
        });
    } catch (err) {
        next(err);
    }
};

export const retireHorse = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.params.id as string;
        if (!uuidValidate(id)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [horse] = await db.select().from(horses).where(eq(horses.id, id));

        if (!horse) {
            return res.status(404).json({ message: "Horse not found" });
        }

        if (horse.ownerId !== req.user!.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const result = await db.transaction(async (tx) => {
            const [lockedHorse] = await tx
                .select({
                    isRetired: horses.isRetired,
                    isRacing: isRacingSubquery,
                })
                .from(horses)
                .where(eq(horses.id, id))
                .for("update");

            if (!lockedHorse) {
                return {
                    ok: false as const,
                    status: 404,
                    message: "Horse not found",
                };
            }

            if (lockedHorse.isRetired) {
                return {
                    ok: false as const,
                    status: 400,
                    message: "Horse is already retired",
                };
            }

            if (lockedHorse.isRacing) {
                return {
                    ok: false as const,
                    status: 409,
                    message:
                        "Profile locked. This horse has active tournament commitments.",
                };
            }

            const [updatedHorse] = await tx
                .update(horses)
                .set({ isRetired: true })
                .where(eq(horses.id, id))
                .returning();

            return { ok: true as const, horse: updatedHorse };
        });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }
        res.json({
            message: "Horse retired successfully",
            horse: result.horse,
        });
    } catch (err) {
        next(err);
    }
};
