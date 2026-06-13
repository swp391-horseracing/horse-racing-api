import { Router } from "express";
import {
    getTournament,
    getTournamentRaces,
    getTournaments,
} from "../controller/tournament.js";
import { optionalAuthMiddleware } from "../middleware/optionalAuth.js";

const router = Router();

router.get("/", optionalAuthMiddleware, getTournaments);
router.get("/:id", optionalAuthMiddleware, getTournament);
router.get("/:id/races", getTournamentRaces);

export default router;
