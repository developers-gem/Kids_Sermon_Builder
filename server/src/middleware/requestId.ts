import type { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";

declare module "express-serve-static-core" {
  interface Request {
    requestId: string;
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  req.requestId = incoming && incoming.length <= 100 ? incoming : uuid();
  res.setHeader("x-request-id", req.requestId);
  next();
}
