import { Router } from "express";
import {
    createPrediction,
    getRaceEntries,
    getHorseEntries,
    getRace,
} from "../controller/race.js";
import { optionalAuthMiddleware } from "../middleware/optionalAuth.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { Role } from "../types/roles.js";

const router = Router();

router.get("/:raceId", optionalAuthMiddleware, getRace);
router.get("/:raceId/horses", optionalAuthMiddleware, getHorseEntries);
router.get("/:raceId/entries", optionalAuthMiddleware, getRaceEntries);
router.post(
    "/:raceId/predictions",
    authMiddleware,
    authorize(Role.SPECTATOR),
    createPrediction,
);

export default router;
