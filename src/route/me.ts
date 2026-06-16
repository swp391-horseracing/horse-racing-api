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
    getMyInvitations,
    getInvitationDetail,
} from "../controller/me.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { Role } from "../types/roles.js";

const router = Router();

// profile route
router.get("/profile", authMiddleware, getMeProfile);
router.get("/races", authMiddleware, getMeRaces);
router.get("/races/:raceId", authMiddleware, getMeRaceDetail);

// owner registrations
router.get(
    "/registrations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    getMyRegistrations,
);

// owner invitations
router.get(
    "/races/:raceId/invitations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    getRaceInvitations,
);
router.post(
    "/races/:raceId/invitations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    inviteJockey,
);
router.patch(
    "/races/:raceId/invitations/:id/confirm",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    confirmJockey,
);
router.delete(
    "/races/:raceId/invitations/:id",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    cancelInvitation,
);

// jockey: all received invitations
router.get(
    "/invitations",
    authMiddleware,
    authorize(Role.JOCKEY),
    getMyInvitations,
);
router.get(
    "/invitations/:id",
    authMiddleware,
    authorize(Role.JOCKEY),
    getInvitationDetail,
);

// jockey invitations
router.patch(
    "/invitations/:id/accept",
    authMiddleware,
    authorize(Role.JOCKEY),
    acceptInvitation,
);


export default router;
