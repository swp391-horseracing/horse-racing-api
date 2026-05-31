import { Router } from "express";
import { register, login, logout } from "../controller/auth.js";
import { registerSchema, loginSchema } from "../validator/auth.js";
import { validate } from "../middleware/validate.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", authMiddleware, logout);

export default router;
