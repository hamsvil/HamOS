import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@HamKeyGen2024!";
const ADMIN_DISPLAY = process.env.ADMIN_DISPLAY || "Administrator";

async function seed() {
  const client = await pool.connect();
  try {
    const existing = await client.query("SELECT id FROM users WHERE username = $1", [ADMIN_USERNAME]);
    if (existing.rows.length > 0) {
      console.log(`User '${ADMIN_USERNAME}' already exists. Skipping.`);
      return;
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await client.query(
      "INSERT INTO users (username, password_hash, display_name, role) VALUES ($1, $2, $3, $4)",
      [ADMIN_USERNAME, hash, ADMIN_DISPLAY, "admin"]
    );
    console.log(`Admin user '${ADMIN_USERNAME}' created successfully.`);
    console.log(`Default password: ${ADMIN_PASSWORD}`);
    console.log("IMPORTANT: Change this password after first login!");

    const providerCheck = await client.query("SELECT COUNT(*) as count FROM providers");
    if (parseInt(providerCheck.rows[0].count) === 0) {
      const builtinProviders = [
        {
          slug: "gemini",
          name: "Google Gemini",
          category: "AI",
          validate_url: "https://generativelanguage.googleapis.com/v1beta/models?key=",
          validate_method: "GET",
          validate_header: "query",
          docs_url: "https://ai.google.dev/docs",
          prefix_pattern: "AIza",
          timeout_ms: 10000,
        },
        {
          slug: "groq",
          name: "Groq",
          category: "AI",
          validate_url: "https://api.groq.com/openai/v1/models",
          validate_method: "GET",
          validate_header: "Authorization: Bearer",
          docs_url: "https://console.groq.com/docs",
          prefix_pattern: "gsk_",
          timeout_ms: 10000,
        },
        {
          slug: "openrouter",
          name: "OpenRouter",
          category: "AI",
          validate_url: "https://openrouter.ai/api/v1/auth/key",
          validate_method: "GET",
          validate_header: "Authorization: Bearer",
          docs_url: "https://openrouter.ai/docs",
          prefix_pattern: "sk-or-",
          timeout_ms: 10000,
        },
        {
          slug: "openai",
          name: "OpenAI",
          category: "AI",
          validate_url: "https://api.openai.com/v1/models",
          validate_method: "GET",
          validate_header: "Authorization: Bearer",
          docs_url: "https://platform.openai.com/docs",
          prefix_pattern: "sk-",
          timeout_ms: 10000,
        },
        {
          slug: "anthropic",
          name: "Anthropic",
          category: "AI",
          validate_url: "https://api.anthropic.com/v1/models",
          validate_method: "GET",
          validate_header: "x-api-key",
          docs_url: "https://docs.anthropic.com",
          prefix_pattern: "sk-ant-",
          timeout_ms: 10000,
        },
      ];

      for (const p of builtinProviders) {
        await client.query(
          `INSERT INTO providers (slug, name, category, validate_url, validate_method, validate_header, docs_url, prefix_pattern, timeout_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [p.slug, p.name, p.category, p.validate_url, p.validate_method, p.validate_header, p.docs_url, p.prefix_pattern, p.timeout_ms]
        );
      }
      console.log(`Seeded ${builtinProviders.length} builtin providers.`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
