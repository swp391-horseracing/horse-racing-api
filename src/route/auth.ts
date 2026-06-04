import { Router } from "express";
import { register, login, logout } from "../controller/auth.js";
import { registerSchema, loginSchema } from "../validator/auth.js";
import { validate } from "../middleware/validate.js";
import { authMiddleware } from "../middleware/auth.js";
import { verifyRecaptcha } from "../middleware/recaptcha.js";

const router = Router();

router.post("/register", verifyRecaptcha, validate(registerSchema), register);
router.post("/login", verifyRecaptcha, validate(loginSchema), login);
router.post("/logout", authMiddleware, logout);

export default router;
