import type { NextFunction, Request, RequestHandler, Response } from "express";

/** An error that maps directly to an HTTP response. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Express 4 doesn't catch rejected promises from async handlers, so every
 * async route goes through this wrapper to reach the error middleware.
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req as Req, res, next).catch(next);
  };
}

/** Parses a positive integer route param, or throws a 400. */
export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Invalid id");
  }
  return id;
}
