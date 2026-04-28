import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "dasopano21";
const displayName = process.env.ADMIN_DISPLAY ?? "Administrator";

if (password.length < 10) {
  console.error("ADMIN_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

async function main() {
  const hash = await bcrypt.hash(password, 12);
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(usersTable).values({
      username, passwordHash: hash, displayName, role: "admin",
    });
    console.log(`Created admin '${username}'.`);
  } else {
    await db
      .update(usersTable)
      .set({ passwordHash: hash, role: "admin", displayName })
      .where(eq(usersTable.id, existing[0].id));
    console.log(`Reset admin '${username}'.`);
  }

  console.log("Username:", username);
  console.log("Password:", password);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
