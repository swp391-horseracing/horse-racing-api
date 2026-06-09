import { Router } from "express";
import { Role } from "../types/roles.js";
import { authMiddleware } from "../middleware/auth.js";
import { getUsers } from "../controller/admin.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.get("/users", authMiddleware, authorize(Role.ADMIN), getUsers);

export default router;
