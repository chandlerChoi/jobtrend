import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { db } from "../../server/db.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const fairs = await db.listJobFairs();
  res.status(200).json({ fairs });
});
