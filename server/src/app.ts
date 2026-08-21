import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { requestId } from "./middleware/requestId.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

import { authRouter } from "./routes/auth.routes.js";
import { storyRouter } from "./routes/story.routes.js";
import { lessonRouter } from "./routes/lesson.routes.js";
import { aiRouter } from "./routes/ai.routes.js";
import { audioRouter } from "./routes/audio.routes.js";
import { sharedRouter } from "./routes/shared.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
export function createApp() {
  const app = express();

  // Trust the first proxy hop (needed for correct req.ip behind Render/Fly/nginx).
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as unknown as { requestId: string }).requestId,
      autoLogging: {
        ignore: (req) => (req as { url?: string }).url === "/health",
      },
    }),
  );

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(apiRateLimiter);

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" } });
  });

  // Serves locally-stored generated media (currently: cached narration
  // audio; STORAGE_DRIVER=local writes here — see integrations/storage).
  // Cache-Control is set generously since filenames are content-hashed:
  // the same URL never points to different bytes, so it's always safe to
  // cache hard.
  app.use(
    "/media",
    express.static(env.STORAGE_LOCAL_DIR, {
      maxAge: "30d",
      immutable: true,
    }),
  );

  app.use("/api/auth", authRouter);
  app.use("/api/stories", storyRouter);
  app.use("/api/lessons", lessonRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/lessons/:lessonId/audio", audioRouter);
  app.use("/api/shared", sharedRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
