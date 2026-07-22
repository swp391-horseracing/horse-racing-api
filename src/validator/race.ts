import { z } from "zod";

const validRaceStatuses = [
    "scheduled",
    "pre_race",
    "ongoing",
    "under_review",
    "completed",
    "postponed",
    "cancelled",
] as const;

export const listRacesQuerySchema = z
    .object({
        status: z.string().optional(),
        sort: z
            .enum(["scheduleAt", "name", "createdAt", "status", "raceNumber"])
            .default("scheduleAt")
            .optional(),
        order: z.enum(["asc", "desc"]).default("asc").optional(),
        page: z.coerce.number().int().min(1).default(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    })
    .refine(
        (data) => {
            if (!data.status) return true;
            const statuses = data.status.split(",").filter(Boolean);
            if (statuses.length === 0) return false;
            return statuses.every((s) =>
                (validRaceStatuses as readonly string[]).includes(s),
            );
        },
        {
            message: `Invalid status value(s). Valid values: ${validRaceStatuses.join(", ")}`,
            path: ["status"],
        },
    );

export const raceHistoryQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    status: z.enum(validRaceStatuses).optional(),
});
