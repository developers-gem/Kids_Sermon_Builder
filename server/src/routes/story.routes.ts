import { Router } from "express";
import { storyController } from "../controllers/storyController.js";
import { validate } from "../middleware/validate.js";
import { StoryQueryInput } from "@ksb/validation";

export const storyRouter = Router();

storyRouter.get("/featured", storyController.featured);
storyRouter.get("/", validate(StoryQueryInput, "query"), storyController.list);
storyRouter.get("/:id", storyController.getById);
