import { Router } from "express";
import { getMeProfile, getMeRaceDetail, getMeRaces } from "../controller/me.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/profile", authMiddleware, getMeProfile);
router.get("/races", authMiddleware, getMeRaces);
router.get("/races/:raceId", authMiddleware, getMeRaceDetail);

export default router;
