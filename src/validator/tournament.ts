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
    page: z.string().optional(),
    limit: z.string().optional(),
});

export { tournamentsQuerySchema };
