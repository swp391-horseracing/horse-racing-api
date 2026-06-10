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
    role: z
        .enum(["jockey", "spectator", "horse_owner", "referee", "admin"])
        .optional(),
});

export { usersQuerySchema, updateRoleSchema };
