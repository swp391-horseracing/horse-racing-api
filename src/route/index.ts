import { Router } from "express";
import authRoutes from "./auth.js";
import profileRoutes from "./profile.js";
import scheduleRoutes from "./schedule.js";
import raceRoutes from "./race.js";
import horseRoutes from "./horse.js";
import tournamentRoutes from "./tournament.js";
import meRoutes from "./me.js";
import adminRoutes from "./admin.js";
import jockeyRoutes from "./jockey.js";
import refereeRoutes from "./referee.js";
import courseRoutes from "./course.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/me", meRoutes);
router.use("/profiles", profileRoutes);
router.use("/jockeys", jockeyRoutes);
router.use("/referee", refereeRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/races", raceRoutes);
router.use("/courses", courseRoutes);
router.use("/horses", horseRoutes);
router.use("/tournaments", tournamentRoutes);

router.get("/health", (_req, res) => res.json({ status: "ok" }));

export default router;
