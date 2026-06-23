import { z } from "zod/v4";

export const reportsQuerySchema = z.object({
    resultStatus: z
        .enum(["draft", "referee_confirmed", "published"])
        .optional(),
    search: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});
