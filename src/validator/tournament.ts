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
    limit: z.coerce.number().int().min(1).max(100).default(1).optional(),
});

export { tournamentsQuerySchema };
