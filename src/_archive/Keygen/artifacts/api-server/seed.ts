import { db } from "@workspace/db";
import { usersTable, providersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@HamKeyGen2024!";
const ADMIN_DISPLAY = process.env.ADMIN_DISPLAY || "Administrator";

async function seed() {
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, ADMIN_USERNAME)).limit(1);
  if (existing.length > 0) {
    console.log(`User '${ADMIN_USERNAME}' already exists. Skipping.`);
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await db.insert(usersTable).values({ username: ADMIN_USERNAME, passwordHash: hash, displayName: ADMIN_DISPLAY, role: "admin" });
    console.log(`Admin user '${ADMIN_USERNAME}' created.`);
    console.log(`Default password: ${ADMIN_PASSWORD}`);
  }

  const providerCount = await db.select({ c: sql<number>`count(*)` }).from(providersTable);
  if (Number(providerCount[0].c) === 0) {
    const builtins = [
      { slug: "gemini", name: "Google Gemini", category: "AI", validateUrl: "https://generativelanguage.googleapis.com/v1beta/models?key=", validateMethod: "GET", validateHeader: "query", docsUrl: "https://ai.google.dev/docs", prefixPattern: "AIza", timeoutMs: 10000 },
      { slug: "groq", name: "Groq", category: "AI", validateUrl: "https://api.groq.com/openai/v1/models", validateMethod: "GET", validateHeader: "Authorization: Bearer", docsUrl: "https://console.groq.com/docs", prefixPattern: "gsk_", timeoutMs: 10000 },
      { slug: "openrouter", name: "OpenRouter", category: "AI", validateUrl: "https://openrouter.ai/api/v1/auth/key", validateMethod: "GET", validateHeader: "Authorization: Bearer", docsUrl: "https://openrouter.ai/docs", prefixPattern: "sk-or-", timeoutMs: 10000 },
      { slug: "openai", name: "OpenAI", category: "AI", validateUrl: "https://api.openai.com/v1/models", validateMethod: "GET", validateHeader: "Authorization: Bearer", docsUrl: "https://platform.openai.com/docs", prefixPattern: "sk-", timeoutMs: 10000 },
      { slug: "anthropic", name: "Anthropic", category: "AI", validateUrl: "https://api.anthropic.com/v1/models", validateMethod: "GET", validateHeader: "x-api-key", docsUrl: "https://docs.anthropic.com", prefixPattern: "sk-ant-", timeoutMs: 10000 },
    ];
    for (const p of builtins) {
      await db.insert(providersTable).values(p);
    }
    console.log(`Seeded ${builtins.length} providers.`);
  }

  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
