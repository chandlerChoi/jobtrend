import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { requireUser } from "../../server/auth.js";
import { db } from "../../server/db.js";

// GET    /api/bookmarks           — { news, ids } (saved postings + id set)
// POST   /api/bookmarks           — body { newsId } add
// DELETE /api/bookmarks?newsId=…  — remove
export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const user = await requireUser(req);

  if (req.method === "GET") {
    const [news, ids] = await Promise.all([
      db.listBookmarkedNews(user.id),
      db.listBookmarkedNewsIds(user.id)
    ]);
    res.status(200).json({ news, ids });
    return;
  }

  if (req.method === "POST") {
    const { newsId } = (req.body ?? {}) as { newsId?: string };
    if (!newsId) {
      res.status(400).json({ error: "newsId required" });
      return;
    }
    const bookmark = await db.addBookmark(user.id, newsId);
    res.status(201).json({ bookmark });
    return;
  }

  if (req.method === "DELETE") {
    const newsId = req.query.newsId ? String(req.query.newsId) : null;
    if (!newsId) {
      res.status(400).json({ error: "newsId required" });
      return;
    }
    const removed = await db.removeBookmark(user.id, newsId);
    res.status(removed ? 200 : 404).json({ removed });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
});
