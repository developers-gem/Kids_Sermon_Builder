import { Router } from "express";
import { adminStoryController } from "../controllers/adminStoryController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  CreateStoryInput,
  UpdateStoryInput,
  SetStoryStatusInput,
  AdminStoryQueryInput,
} from "@ksb/validation";

export const adminRouter = Router();

// Every route here requires both a valid session AND the admin role —
// enforced here in middleware, not left to the frontend to hide a button
// (Prompt 21: "Do not rely on hiding UI buttons").
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/stories", validate(AdminStoryQueryInput, "query"), adminStoryController.list);
adminRouter.get("/stories/:id", adminStoryController.getById);
adminRouter.post("/stories", validate(CreateStoryInput), adminStoryController.create);
adminRouter.put("/stories/:id", validate(UpdateStoryInput), adminStoryController.update);
adminRouter.patch(
  "/stories/:id/status",
  validate(SetStoryStatusInput),
  adminStoryController.setStatus,
);
adminRouter.delete("/stories/:id", adminStoryController.remove);
