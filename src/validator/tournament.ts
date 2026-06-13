import { z } from "zod";

const tournamentsQuerySchema = z.object({
    status: z
        .enum([
            "upcoming",
            "registration_open",
            "registration_closed",
            "ongoing",
            "completed",
            "cancelled",
        ])
        .optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

const adminTournamentsQuerySchema = z.object({
    status: z
        .enum([
            "draft",
            "upcoming",
            "registration_open",
            "registration_closed",
            "ongoing",
            "completed",
            "cancelled",
        ])
        .optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

const tournamentRacesQuerySchema = z.object({
    status: z
        .enum([
            "scheduled",
            "pre_race",
            "ongoing",
            "under_review",
            "result_confirmed",
            "completed",
            "postponed",
            "cancelled",
        ])
        .optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

export {
    tournamentsQuerySchema,
    tournamentRacesQuerySchema,
    adminTournamentsQuerySchema,
};
