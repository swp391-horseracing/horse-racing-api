import { z } from "zod";

export const createRaceEntryRequest = z.object({
    horseId: z.uuid("horseId must be a valid UUID"),
});
