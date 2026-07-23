import { z } from "zod";

export const createPredictionSchema = z.object({
    predictedEntryId: z.uuid(),
    predictedPosition: z.number().int().min(1).max(3),
    stakeAmount: z.number().int().min(1),
});

export const predictionsQuerySchema = z.object({
    search: z.string().optional(),
    status: z.enum(["pending", "correct", "incorrect"]).optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});
