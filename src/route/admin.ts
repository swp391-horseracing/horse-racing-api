import { Router } from "express";
import { Role } from "../types/roles.js";
import { authMiddleware } from "../middleware/auth.js";
import { getUser, getUsers } from "../controller/admin.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.get("/users", authMiddleware, authorize(Role.ADMIN), getUsers);
router.get("/users/:userId", authMiddleware, authorize(Role.ADMIN), getUser);
export default router;
