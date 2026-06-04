import { NextFunction, Request, Response } from "express";
import { eq, and, or } from "drizzle-orm";
import { validate as uuidValidate } from "uuid";
import db from "../config/db.js";
import { horses } from "../schema/horses.js";
import { raceEntries } from "../schema/raceEntries.js";

export const getMyHorses = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const myHorses = await db
            .select()
            .from(horses)
            .where(eq(horses.ownerId, req.user!.id));
        res.json({ horses: myHorses });
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

        const [horse] = await db.select().from(horses).where(eq(horses.id, id));

        if (!horse) {
            return res.status(404).json({ message: "Horse not found" });
        }

        if (req.user!.role !== "admin" && horse.ownerId !== req.user!.id) {
            return res.status(403).json({ message: "Forbidden" });
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
        if (req.user!.role !== "horse_owner" && req.user!.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }

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

        const [existing] = await db
            .select()
            .from(horses)
            .where(eq(horses.id, id));

        if (!existing) {
            return res.status(404).json({ message: "Horse not found" });
        }

        if (req.user!.role !== "admin" && existing.ownerId !== req.user!.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (existing.isRetired) {
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
        const set: Record<string, any> = {};
        if (name !== undefined) set.name = name;
        if (breed !== undefined) set.breed = breed;
        if (birthDate !== undefined) set.birthDate = birthDate;
        if (weightKg !== undefined) set.weightKg = weightKg;
        if (imageUrl !== undefined) set.imageUrl = imageUrl;
        if (healthStatus !== undefined) set.healthStatus = healthStatus;

        const [updated] = await db
            .update(horses)
            .set(set)
            .where(eq(horses.id, id))
            .returning();

        res.json({ horse: updated });
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

        const [existing] = await db
            .select()
            .from(horses)
            .where(eq(horses.id, id));

        if (!existing) {
            return res.status(404).json({ message: "Horse not found" });
        }

        if (req.user!.role !== "admin" && existing.ownerId !== req.user!.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const result = await db.transaction(async (tx) => {
            const [locked] = await tx
                .select()
                .from(horses)
                .where(eq(horses.id, id))
                .for("update");

            if (!locked || locked.isRetired) {
                return {
                    ok: false as const,
                    status: 400,
                    message: "Horse is already retired",
                };
            }

            const activeEntries = await tx
                .select({ id: raceEntries.id })
                .from(raceEntries)
                .where(
                    and(
                        eq(raceEntries.horseId, id),
                        or(
                            eq(raceEntries.entryStatus, "pending"),
                            eq(raceEntries.entryStatus, "confirmed"),
                        ),
                    ),
                );

            if (activeEntries.length > 0) {
                return {
                    ok: false as const,
                    status: 409,
                    message:
                        "Profile locked. This horse has active tournament commitments.",
                };
            }

            const [updated] = await tx
                .update(horses)
                .set({ isRetired: true })
                .where(eq(horses.id, id))
                .returning();

            return { ok: true as const, horse: updated };
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
