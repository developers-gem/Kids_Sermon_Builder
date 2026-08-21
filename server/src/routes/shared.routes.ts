import { Router } from "express";
import { sharedController } from "../controllers/sharedController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

export const sharedRouter = Router();

sharedRouter.get("/:token", optionalAuth, sharedController.getByToken);
sharedRouter.post("/:token/duplicate", requireAuth, sharedController.duplicate);
