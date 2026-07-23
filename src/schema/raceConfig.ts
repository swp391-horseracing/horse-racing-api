import { pgTable, uuid, boolean, integer } from "drizzle-orm/pg-core";
import { races } from "./races.js";

export const raceConfigs = pgTable("race_configs", {
    raceId: uuid("race_id")
        .primaryKey()
        .references(() => races.id, { onDelete: "cascade" }),
    predictionsEnabled: boolean("predictions_enabled").notNull().default(true),
    predictionRewardPoints: integer("prediction_reward_points")
        .notNull()
        .default(100),
});
