import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { db } from "../lib/db.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const fairs = await db.listJobFairs();
  res.status(200).json({ fairs });
});
