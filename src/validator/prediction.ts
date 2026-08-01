import { z } from "zod";

export const createPredictionSchema = z.object({
    predictions: z
        .array(
            z.object({
                predictedEntryId: z.uuid(),
                predictedPosition: z.number().int().min(1).max(3),
                stakeAmount: z.number().int().min(1),
            }),
        )
        .min(1, "At least one prediction is required")
        .max(3, "At most 3 predictions per race")
        .refine(
            (items) => {
                const seen = new Set<string>();
                for (const item of items) {
                    if (seen.has(item.predictedEntryId)) return false;
                    seen.add(item.predictedEntryId);
                }
                return true;
            },
            { message: "Duplicate predictions for the same horse" },
        ),
});

export const predictionsQuerySchema = z.object({
    search: z.string().optional(),
    status: z.enum(["pending", "correct", "incorrect"]).optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});
