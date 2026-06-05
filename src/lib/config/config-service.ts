import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { encrypt, decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import type { ActiveConfigData, ProviderConfigData } from "@/types";

ensureDb();

export function getActiveConfig(): ActiveConfigData {
  const row = db.select().from(schema.activeConfig).get();
  if (!row) {
    throw new Error("No active config found");
  }
  return {
    provider: row.provider,
    modelId: row.modelId,
    thinkingLevel: row.thinkingLevel,
    systemPrompt: row.systemPrompt,
    toolExecutionMode: row.toolExecutionMode,
  };
}

export function updateActiveConfig(data: Partial<ActiveConfigData>): ActiveConfigData {
  const current = db.select().from(schema.activeConfig).get();
  if (!current) throw new Error("No active config found");

  db.update(schema.activeConfig)
    .set(data)
    .where(eq(schema.activeConfig.id, current.id))
    .run();

  return getActiveConfig();
}

export function getProviderConfig(provider: string): ProviderConfigData | null {
  const row = db
    .select()
    .from(schema.providerConfigs)
    .where(eq(schema.providerConfigs.provider, provider))
    .get();

  if (!row) return null;
  return {
    provider: row.provider,
    apiKey: decrypt(row.apiKey),
    baseUrl: row.baseUrl,
  };
}

export function getAllProviderConfigs(): { provider: string; hasKey: boolean; baseUrl?: string | null }[] {
  const rows = db.select().from(schema.providerConfigs).all();
  return rows.map((r) => ({
    provider: r.provider,
    hasKey: true,
    baseUrl: r.baseUrl,
  }));
}

export function saveProviderConfig(data: ProviderConfigData): void {
  const now = Date.now();
  const encrypted = encrypt(data.apiKey);

  const existing = db
    .select()
    .from(schema.providerConfigs)
    .where(eq(schema.providerConfigs.provider, data.provider))
    .get();

  if (existing) {
    db.update(schema.providerConfigs)
      .set({
        apiKey: encrypted,
        baseUrl: data.baseUrl ?? null,
        updatedAt: now,
      })
      .where(eq(schema.providerConfigs.provider, data.provider))
      .run();
  } else {
    db.insert(schema.providerConfigs)
      .values({
        provider: data.provider,
        apiKey: encrypted,
        baseUrl: data.baseUrl ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

export function deleteProviderConfig(provider: string): void {
  db.delete(schema.providerConfigs)
    .where(eq(schema.providerConfigs.provider, provider))
    .run();
}

export function getDecryptedApiKey(provider: string): string | null {
  const config = getProviderConfig(provider);
  return config?.apiKey ?? null;
}
