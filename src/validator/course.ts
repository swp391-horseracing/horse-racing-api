import { z } from "zod";

export const createCourseSchema = z.object({
    name: z.string().min(3).max(255),
    country: z.string().max(100).default("Vietnam"),
    city: z.string().min(1).max(150),
    address: z.string().optional(),
    surfaceType: z.enum(["turf", "dirt", "synthetic"]),
    trackShapeId: z.uuid("trackShapeId must be a valid UUID"),
    distanceMeters: z.coerce.number().int().positive(),
    maxStartingPositions: z.coerce.number().int().positive(),
    grandstandCapacity: z.coerce.number().int().positive(),
    status: z
        .enum(["active", "inactive", "under_maintainance"])
        .default("active"),
});

export const updateCourseSchema = z
    .object({
        name: z.string().min(3).max(255).optional(),
        country: z.string().max(100).optional(),
        city: z.string().min(1).max(150).optional(),
        address: z.string().optional(),
        surfaceType: z.enum(["turf", "dirt", "synthetic"]).optional(),
        trackShapeId: z.uuid("trackShapeId must be a valid UUID").optional(),
        distanceMeters: z.coerce.number().int().positive().optional(),
        maxStartingPositions: z.coerce.number().int().positive().optional(),
        grandstandCapacity: z.coerce.number().int().positive().optional(),
    })
    .superRefine((data, ctx) => {
        if (Object.keys(data).length === 0) {
            ctx.addIssue({
                code: "custom",
                message: "At least one field must be provided",
            });
        }
    });

export const updateCourseStatusSchema = z.object({
    status: z.enum(["active", "inactive", "under_maintainance"]),
});

export const courseQuerySchema = z.object({
    search: z.string().optional(),
    status: z.enum(["active", "inactive", "under_maintainance"]).optional(),
    surfaceType: z.enum(["turf", "dirt", "synthetic"]).optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

export const createCourseDistanceSchema = z.object({
    distanceMeters: z.coerce.number().int().positive(),
});
