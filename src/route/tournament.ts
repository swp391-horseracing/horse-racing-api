import { Router } from "express";
import {
    getTournament,
    getTournamentRaces,
    getTournaments,
    registerForTournament,
    getTournamentRegistration,
} from "../controller/tournament.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { Role } from "../types/roles.js";

const router = Router();

router.get("/", getTournaments);
router.get("/:id", getTournament);
router.get("/:id/races", getTournamentRaces);
router.post(
    "/:id/registrations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    registerForTournament,
);
router.get("/:id/registrations/:regId", getTournamentRegistration);

export default router;
