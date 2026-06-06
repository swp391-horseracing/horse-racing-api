import { Router } from "express";
import {
    getTournament,
    getTournamentRaces,
    getTournaments,
} from "../controller/tournament.js";

const router = Router();

router.get("/", getTournaments);
router.get("/:id", getTournament);
router.get("/:id/races", getTournamentRaces);

export default router;
