import { mockBackend, persistStore as persistMockStore } from "./mockBackend.js";
import { neonBackend } from "./neonBackend.js";
import type { Db } from "./dbTypes.js";

export const db: Db = process.env.DATABASE_URL ? neonBackend : mockBackend;

// Mock backend needs an explicit flush to disk after each request (see
// api/lib/respond.ts); Neon writes are already durable per-query.
export function persistStore(): void {
  if (!process.env.DATABASE_URL) persistMockStore();
}
