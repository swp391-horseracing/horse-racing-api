import { Router } from "express";
import {
    getHorses,
    getHorse,
    addHorse,
    updateHorse,
    retireHorse,
} from "../controller/horse.js";
import { addHorseSchema, updateHorseSchema } from "../validator/horse.js";
import { validate } from "../middleware/validate.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/", getHorses);
router.get("/:id", getHorse);
router.post("/", authMiddleware, validate(addHorseSchema), addHorse);
router.patch("/:id", authMiddleware, validate(updateHorseSchema), updateHorse);
router.post("/:id/retire", authMiddleware, retireHorse);

export default router;
