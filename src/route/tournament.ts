import { Router } from "express";
import {
    getTournament,
    getTournamentRaces,
    getTournaments,
} from "../controller/tournament.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/", getTournaments);
router.get("/:id", authMiddleware, getTournament);
router.get("/:id/races", getTournamentRaces);

export default router;
