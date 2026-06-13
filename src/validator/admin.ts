import { z } from "zod";

const usersQuerySchema = z.object({
    search: z.string().optional(),
    status: z.enum(["pending", "active", "locked"]).optional(),
    role: z
        .enum(["jockey", "spectator", "horse_owner", "referee", "admin"])
        .optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

const updateRoleSchema = z.object({
    role: z.enum(["jockey", "spectator", "horse_owner", "referee", "admin"]),
});

const updateStatusSchema = z.object({
    status: z.enum(["active", "locked"]),
});

const createTournamentSchema = z.object({
    name: z.string().min(3).max(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    description: z.string().optional(),
    rules: z.string().optional(),
    location: z.string().max(200).optional(),
    registrationOpenDate: z.iso.datetime().optional(),
    registrationCloseDate: z.iso.datetime().optional(),
    maximumParticipants: z.number().int().positive().optional(),
    minimumParticipants: z.number().int().positive().optional(),
    prizePool: z.float64().positive().optional(),
});

export {
    usersQuerySchema,
    updateRoleSchema,
    updateStatusSchema,
    createTournamentSchema,
};
