import { Router } from "express";
import { getJockeys } from "../controller/jockey.js";
const router = Router();

router.get("/", getJockeys);

export default router;
