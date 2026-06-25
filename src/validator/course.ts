import { z } from "zod";
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
