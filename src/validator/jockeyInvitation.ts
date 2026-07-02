import { z } from "zod";

export const inviteJockeySchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    message: z.string().optional(),
    jockeyId: z.uuid("jockeyId must be a valid UUID"),
    entryId: z.uuid("entryId must be a valid UUID"),
});

export const invitationsQuerySchema = z.object({
    status: z.enum(["pending", "accepted", "declined", "cancelled"]).optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});
