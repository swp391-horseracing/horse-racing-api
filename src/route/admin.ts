import { Router } from "express";
import { Role } from "../types/roles.js";
import { authMiddleware } from "../middleware/auth.js";
import { getUser, getUsers, updateUserRole } from "../controller/admin.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { updateRoleSchema } from "../validator/admin.js";

const router = Router();

router.get("/users", authMiddleware, authorize(Role.ADMIN), getUsers);
router.get("/users/:userId", authMiddleware, authorize(Role.ADMIN), getUser);
router.get(
    "/users/:userId/role",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateRoleSchema),
    updateUserRole,
);

export default router;
