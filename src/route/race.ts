import { Router } from "express";
import { getHorseEntries, getRace } from "../controller/race.js";

const router = Router();

router.get("/:raceId", getRace);
router.get("/:raceId/horses", getHorseEntries);

export default router;
