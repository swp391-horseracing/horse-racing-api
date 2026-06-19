import { NextFunction, Request, Response } from "express";
import { eq, and, ilike, sql, gte, lte } from "drizzle-orm";
import { validate as uuidValidate } from "uuid";
import db from "../config/db.js";
import { horses } from "../schema/horses.js";
import { races } from "../schema/races.js";
import { raceEntries } from "../schema/raceEntries.js";
import { horsesQuerySchema } from "../validator/horse.js";
import { getPagination, paginatedResponse } from "../utils/paginate.js";

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

        return res.json(
            paginatedResponse(data, Number(count[0]?.count ?? 0), p, l),
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

        return res.json(
            paginatedResponse(data, Number(count[0]?.count ?? 0), p, l),
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
                createdAt: horses.createdAt,
                updatedAt: horses.updatedAt,
                isRacing: isRacingSubquery,
            })
            .from(horses)
            .where(eq(horses.id, id));

        if (!horse) {
            return res.status(404).json({ message: "Horse not found" });
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
    try {
        const { name, breed, birthDate, weightKg, imageUrl, healthStatus } =
            req.body;

        const [horse] = await db
            .insert(horses)
            .values({
                ownerId: req.user!.id,
                name,
                breed,
                birthDate: birthDate ?? null,
                weightKg: weightKg ?? null,
                imageUrl: imageUrl ?? null,
                healthStatus: healthStatus ?? null,
                isRetired: false,
            })
            .returning();

        res.status(201).json({ horse });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
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

        const { name, breed, birthDate, weightKg, imageUrl, healthStatus } =
            req.body;

        if (
            name === undefined &&
            breed === undefined &&
            birthDate === undefined &&
            weightKg === undefined &&
            imageUrl === undefined &&
            healthStatus === undefined
        ) {
            return res.status(400).json({ message: "No fields to update" });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {};
        if (name !== undefined) updates.name = name;
        if (breed !== undefined) updates.breed = breed;
        if (birthDate !== undefined) updates.birthDate = birthDate;
        if (weightKg !== undefined) updates.weightKg = weightKg;
        if (imageUrl !== undefined) updates.imageUrl = imageUrl;
        if (healthStatus !== undefined) updates.healthStatus = healthStatus;

        const [updatedHorse] = await db
            .update(horses)
            .set(updates)
            .where(eq(horses.id, id))
            .returning();

        res.json({ horse: updatedHorse });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err?.cause?.code === "23505") {
            return res
                .status(409)
                .json({ message: "Horse name already in use" });
        }
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
                .select()
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

            const [racingCheck] = await tx
                .select({ isRacing: isRacingSubquery })
                .from(horses)
                .where(eq(horses.id, id));

            if (racingCheck?.isRacing) {
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
