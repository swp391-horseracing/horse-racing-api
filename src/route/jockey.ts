import { Router } from "express";
import {
    getJockeys,
    getJockeyRaceHistory,
    getJockeyLeaderboard,
} from "../controller/jockey.js";
const router = Router();

router.get("/", getJockeys);
router.get("/leaderboard", getJockeyLeaderboard);
router.get("/:jockeyId/races", getJockeyRaceHistory);

export default router;
