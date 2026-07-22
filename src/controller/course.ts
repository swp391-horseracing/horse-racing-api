import { NextFunction, Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import { and, desc, eq, sql } from "drizzle-orm";
import db from "../config/db.js";
import { raceCourses } from "../schema/raceCourses.js";
import { courseDistances } from "../schema/courseDistances.js";
import { trackShapes } from "../schema/trackShapes.js";
import { races } from "../schema/races.js";
import { courseQuerySchema } from "../validator/course.js";
import { getPagination, paginatedResponse } from "../utils/paginate.js";

export const getRaceCourses = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const parsed = courseQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation Errors",
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }
        const { search, status, surfaceType, page, limit } = parsed.data;
        const { page: p, limit: l, offset } = getPagination({ page, limit });

        const conditions = and(
            status ? eq(raceCourses.status, status) : undefined,
            surfaceType ? eq(raceCourses.surfaceType, surfaceType) : undefined,
            search
                ? sql`(${raceCourses.name} ILIKE ${`%${search}%`} OR ${raceCourses.city} ILIKE ${`%${search}%`})`
                : undefined,
        );

        const [data, count] = await Promise.all([
            db
                .select({
                    id: raceCourses.id,
                    name: raceCourses.name,
                    country: raceCourses.country,
                    city: raceCourses.city,
                    surfaceType: raceCourses.surfaceType,
                    distanceMeters: raceCourses.distanceMeters,
                    maxStartingPositions: raceCourses.maxStartingPositions,
                    grandstandCapacity: raceCourses.grandstandCapacity,
                    status: raceCourses.status,
                    trackShape: {
                        id: trackShapes.id,
                        shape: trackShapes.shape,
                    },
                    createdAt: raceCourses.createdAt,
                    updatedAt: raceCourses.updatedAt,
                })
                .from(raceCourses)
                .leftJoin(
                    trackShapes,
                    eq(raceCourses.trackShapeId, trackShapes.id),
                )
                .where(conditions)
                .orderBy(desc(raceCourses.createdAt), desc(raceCourses.id))
                .limit(l)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)` })
                .from(raceCourses)
                .where(conditions),
        ]);

        return res.json(
            paginatedResponse(data, Number(count[0]?.count ?? 0), p, l),
        );
    } catch (err) {
        next(err);
    }
};

export const getRaceCourse = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const courseId = req.params.courseId as string;
        if (!uuidValidate(courseId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [course] = await db
            .select({
                id: raceCourses.id,
                name: raceCourses.name,
                country: raceCourses.country,
                city: raceCourses.city,
                address: raceCourses.address,
                surfaceType: raceCourses.surfaceType,
                distanceMeters: raceCourses.distanceMeters,
                maxStartingPositions: raceCourses.maxStartingPositions,
                grandstandCapacity: raceCourses.grandstandCapacity,
                status: raceCourses.status,
                trackShape: {
                    id: trackShapes.id,
                    shape: trackShapes.shape,
                    description: trackShapes.description,
                },
                createdAt: raceCourses.createdAt,
                updatedAt: raceCourses.updatedAt,
            })
            .from(raceCourses)
            .leftJoin(trackShapes, eq(raceCourses.trackShapeId, trackShapes.id))
            .where(eq(raceCourses.id, courseId));

        if (!course) {
            return res.status(404).json({ message: "Race course not found" });
        }

        const distances = await db
            .select({
                id: courseDistances.id,
                distanceMeters: courseDistances.distanceMeters,
            })
            .from(courseDistances)
            .where(eq(courseDistances.courseId, courseId))
            .orderBy(courseDistances.distanceMeters);

        res.json({ ...course, distances });
    } catch (err) {
        next(err);
    }
};

export const createRaceCourse = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const {
            name,
            country,
            city,
            address,
            surfaceType,
            trackShapeId,
            distanceMeters,
            maxStartingPositions,
            grandstandCapacity,
            status,
        } = req.body;

        const [trackShape] = await db
            .select({ id: trackShapes.id })
            .from(trackShapes)
            .where(eq(trackShapes.id, trackShapeId));

        if (!trackShape) {
            return res.status(400).json({ message: "Track shape not found" });
        }

        const [newCourse] = await db
            .insert(raceCourses)
            .values({
                name,
                country,
                city,
                address: address ?? null,
                surfaceType,
                trackShapeId,
                distanceMeters,
                maxStartingPositions,
                grandstandCapacity,
                status,
            })
            .returning();

        res.status(201).json(newCourse);
    } catch (err) {
        next(err);
    }
};

export const updateRaceCourse = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const courseId = req.params.courseId as string;
        if (!uuidValidate(courseId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const body = req.body;

        if (body.trackShapeId) {
            const [trackShape] = await db
                .select({ id: trackShapes.id })
                .from(trackShapes)
                .where(eq(trackShapes.id, body.trackShapeId));

            if (!trackShape) {
                return res
                    .status(400)
                    .json({ message: "Track shape not found" });
            }
        }

        const [updated] = await db
            .update(raceCourses)
            .set({ ...body, updatedAt: new Date() })
            .where(eq(raceCourses.id, courseId))
            .returning();

        if (!updated) {
            return res.status(404).json({ message: "Race course not found" });
        }

        res.json(updated);
    } catch (err) {
        next(err);
    }
};

export const updateCourseStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const courseId = req.params.courseId as string;
        if (!uuidValidate(courseId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const { status } = req.body;

        const [course] = await db
            .select({ id: raceCourses.id, status: raceCourses.status })
            .from(raceCourses)
            .where(eq(raceCourses.id, courseId));

        if (!course) {
            return res.status(404).json({ message: "Race course not found" });
        }

        if (status === "inactive" || status === "under_maintainance") {
            const [activeRace] = await db
                .select({ id: races.id })
                .from(races)
                .innerJoin(
                    courseDistances,
                    eq(races.courseDistanceId, courseDistances.id),
                )
                .where(
                    and(
                        eq(courseDistances.courseId, courseId),
                        sql`${races.status} NOT IN ('draft', 'completed', 'cancelled')`,
                    ),
                )
                .limit(1);

            if (activeRace) {
                return res.status(409).json({
                    message:
                        "Cannot deactivate course — active races reference it",
                });
            }
        }

        const [updated] = await db
            .update(raceCourses)
            .set({ status, updatedAt: new Date() })
            .where(eq(raceCourses.id, courseId))
            .returning();

        res.json(updated);
    } catch (err) {
        next(err);
    }
};

export const addCourseDistance = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const courseId = req.params.courseId as string;
        if (!uuidValidate(courseId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [course] = await db
            .select({
                id: raceCourses.id,
                distanceMeters: raceCourses.distanceMeters,
            })
            .from(raceCourses)
            .where(eq(raceCourses.id, courseId));

        if (!course) {
            return res.status(404).json({ message: "Race course not found" });
        }

        const { distanceMeters } = req.body;
        if (distanceMeters > course.distanceMeters) {
            return res.status(409).json({
                message: "This distance is higher than maximum course distance",
            });
        }
        const [newDistance] = await db
            .insert(courseDistances)
            .values({ courseId, distanceMeters })
            .returning();

        res.status(201).json(newDistance);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err?.cause?.code === "23505") {
            return res.status(409).json({
                message: "Distance already exists for this course",
            });
        }
        next(err);
    }
};

export const getCourseDistances = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const courseId = req.params.courseId as string;
        if (!uuidValidate(courseId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [course] = await db
            .select({
                id: raceCourses.id,
            })
            .from(raceCourses)
            .where(eq(raceCourses.id, courseId));

        if (!course) {
            return res.status(404).json({ message: "Race course not found" });
        }

        const distances = await db
            .select({
                id: courseDistances.id,
                distanceMeters: courseDistances.distanceMeters,
            })
            .from(courseDistances)
            .where(eq(courseDistances.courseId, courseId))
            .orderBy(courseDistances.distanceMeters);

        res.json(distances);
    } catch (err) {
        next(err);
    }
};

export const getTrackShapes = async (
    _req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const shapes = await db
            .select()
            .from(trackShapes)
            .orderBy(trackShapes.shape);
        res.json(shapes);
    } catch (err) {
        next(err);
    }
};

export const removeCourseDistance = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const courseId = req.params.courseId as string;
        const distanceId = req.params.distanceId as string;

        if (!uuidValidate(courseId) || !uuidValidate(distanceId)) {
            return res.status(400).json({ message: "Invalid uuid" });
        }

        const [distance] = await db
            .select({ id: courseDistances.id })
            .from(courseDistances)
            .where(
                and(
                    eq(courseDistances.id, distanceId),
                    eq(courseDistances.courseId, courseId),
                ),
            );

        if (!distance) {
            return res
                .status(404)
                .json({ message: "Course distance not found" });
        }

        const [activeRace] = await db
            .select({ id: races.id })
            .from(races)
            .where(eq(races.courseDistanceId, distanceId))
            .limit(1);

        if (activeRace) {
            return res.status(409).json({
                message: "Cannot remove distance — races reference it",
            });
        }

        const [deleted] = await db
            .delete(courseDistances)
            .where(eq(courseDistances.id, distanceId))
            .returning();

        res.json({ message: "Distance removed", distance: deleted });
    } catch (err) {
        next(err);
    }
};
