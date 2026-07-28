import { pgTable, uuid, boolean, integer } from "drizzle-orm/pg-core";
import { races } from "./races.js";

export const raceConfigs = pgTable("race_configs", {
    raceId: uuid("race_id")
        .primaryKey()
        .references(() => races.id, { onDelete: "cascade" }),
    predictionsEnabled: boolean("predictions_enabled").notNull().default(true),
    predictionMinStake: integer("prediction_min_stake").notNull().default(50),
    firstPlacePoints: integer("first_place_points").notNull().default(9),
    secondPlacePoints: integer("second_place_points").notNull().default(8),
    thirdPlacePoints: integer("third_place_points").notNull().default(7),
});
