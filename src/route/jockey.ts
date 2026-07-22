import { Router } from "express";
import { getJockeys, getJockeyRaceHistory } from "../controller/jockey.js";
const router = Router();

router.get("/", getJockeys);
router.get("/:jockeyId/races", getJockeyRaceHistory);

export default router;
