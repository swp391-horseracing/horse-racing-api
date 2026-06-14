import { Router } from "express";
import { Role } from "../types/roles.js";
import { authMiddleware } from "../middleware/auth.js";
import {
    createTournament,
    getUser,
    getUsers,
    updateTournament,
    updateUserRole,
    updateUserStatus,
} from "../controller/admin.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
    createTournamentSchema,
    updateRoleSchema,
    updateStatusSchema,
    updateTournamentSchema,
} from "../validator/admin.js";

const router = Router();

router.get("/users", authMiddleware, authorize(Role.ADMIN), getUsers);
router.get("/users/:userId", authMiddleware, authorize(Role.ADMIN), getUser);
router.patch(
    "/users/:userId/role",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateRoleSchema),
    updateUserRole,
);
router.patch(
    "/users/:userId/status",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateStatusSchema),
    updateUserStatus,
);
router.post(
    "/tournaments",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(createTournamentSchema),
    createTournament,
);
router.patch(
    "/tournaments/:tournamentId",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateTournamentSchema),
    updateTournament,
);
export default router;
