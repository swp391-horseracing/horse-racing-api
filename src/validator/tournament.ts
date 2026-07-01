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
    startDateFrom: z.iso.date().optional(),
    startDateTo: z.iso.date().optional(),
    search: z.string().optional(),
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
    startDateFrom: z.iso.date().optional(),
    startDateTo: z.iso.date().optional(),
    search: z.string().optional(),
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

const registerForTournamentSchema = z.object({
    horseId: z.string().uuid("horseId must be a valid UUID"),
});

const myRegistrationsQuerySchema = z.object({
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

const inviteJockeySchema = z.object({
    jockeyId: z.string().uuid("jockeyId must be a valid UUID"),
    horseId: z.string().uuid("horseId must be a valid UUID"),
});

const myResultsQuerySchema = z.object({
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
    registerForTournamentSchema,
    myRegistrationsQuerySchema,
    myResultsQuerySchema,
    inviteJockeySchema,
    adminTournamentsQuerySchema,
};
