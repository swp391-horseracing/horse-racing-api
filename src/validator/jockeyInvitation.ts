import { z } from "zod";

export const inviteJockeySchema = z.object({
    jockeyId: z.string().uuid("jockeyId must be a valid UUID"),
    horseId: z.string().uuid("horseId must be a valid UUID"),
});

export const invitationsQuerySchema = z.object({
    status: z.enum(["pending", "accepted", "declined", "cancelled"]).optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});
