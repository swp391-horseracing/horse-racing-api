import { Router } from "express";
import {
    getMeProfile,
    getMeRaceDetail,
    getMeRaces,
    getMyRegistrations,
    getRaceInvitations,
    inviteJockey,
    cancelInvitation,
    acceptInvitation,
    confirmJockey,
} from "../controller/me.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { Role } from "../types/roles.js";

const router = Router();

router.get("/profile", authMiddleware, getMeProfile);
router.get("/races", authMiddleware, getMeRaces);
router.get("/races/:raceId", authMiddleware, getMeRaceDetail);
router.get(
    "/registrations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    getMyRegistrations,
);
router.get(
    "/races/:raceId/invitations",
    authMiddleware,
    authorize(Role.HORSE_OWNER, Role.JOCKEY),
    getRaceInvitations,
);
router.post(
    "/races/:raceId/invitations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    inviteJockey,
);
router.delete(
    "/races/:raceId/invitations/:id",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    cancelInvitation,
);
router.patch(
    "/races/:raceId/invitations/:id/accept",
    authMiddleware,
    authorize(Role.JOCKEY),
    acceptInvitation,
);
router.patch(
    "/races/:raceId/invitations/:id/confirm",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    confirmJockey,
);

export default router;
