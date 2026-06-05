import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, schema } from "./index";
import { eq } from "drizzle-orm";

let initialized = false;

export function ensureDb() {
  if (initialized) return;

  migrate(db, { migrationsFolder: "./drizzle" });

  const existing = db.select().from(schema.activeConfig).get();
  if (!existing) {
    db.insert(schema.activeConfig)
      .values({
        provider: "anthropic",
        modelId: "claude-sonnet-4-20250514",
        thinkingLevel: "off",
        systemPrompt: "You are a helpful assistant.",
        toolExecutionMode: "parallel",
      })
      .run();
  }

  initialized = true;
}
