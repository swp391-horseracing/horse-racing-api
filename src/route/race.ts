import { Router } from "express";
import { getHorseEntries, getRace } from "../controller/race.js";
import { optionalAuthMiddleware } from "../middleware/optionalAuth.js";

const router = Router();

router.get("/:raceId", optionalAuthMiddleware, getRace);
router.get("/:raceId/horses", getHorseEntries);

export default router;
