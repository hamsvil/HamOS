import { Router } from "express";
import { db } from "@workspace/db";
import { keyTagsTable, apiKeysTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = req.session.userId!;

  const rows = await db.execute(sql`
    SELECT kt.tag, COUNT(*)::int as count
    FROM key_tags kt
    INNER JOIN api_keys ak ON ak.id = kt.key_id
    WHERE ak.user_id = ${userId}
    GROUP BY kt.tag
    ORDER BY count DESC
  `);

  res.json(rows.rows);
});

export default router;
