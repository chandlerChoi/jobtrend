import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AuthError } from "./auth.js";
import { persistStore } from "./db.js";

export function withErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => void | Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "internal_error" });
    } finally {
      persistStore();
    }
  };
}

export function requireCronSecret(req: VercelRequest): void {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers["x-vercel-cron-secret"];
  if (expected && provided !== expected) {
    throw new AuthError("invalid cron secret", 401);
  }
}
