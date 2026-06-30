// MVP auth: the client generates a UUID on first visit (see src/context/AuthContext.tsx),
// stores it in localStorage, and sends it as `x-user-id`. This route-level helper
// resolves that into a users row, auto-provisioning one if needed.
// TODO(api-integration-last): replace with real email/password JWT auth
// (db/schema.sql already has users.password_hash for this) once core features
// are demoed — tracked separately from the Open API integration work.
import type { VercelRequest } from "@vercel/node";
import { db } from "./db.js";
import type { UserRow } from "../shared/types.js";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(req: VercelRequest): Promise<UserRow> {
  const userId = req.headers["x-user-id"];
  if (!userId || typeof userId !== "string") {
    throw new AuthError("x-user-id header required");
  }
  return db.getOrCreateUser(userId);
}
