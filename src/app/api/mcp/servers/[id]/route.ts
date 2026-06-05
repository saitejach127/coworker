import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { eq } from "drizzle-orm";
import {
  connectServer,
  disconnectServer,
  isConnected,
} from "@/lib/mcp/mcp-client-manager";
import { refreshAllAgentTools } from "@/lib/agent/agent-manager";

ensureDb();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const serverId = parseInt(id, 10);
  const body = await req.json();

  const existing = db
    .select()
    .from(schema.mcpServers)
    .where(eq(schema.mcpServers.id, serverId))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.url !== undefined) updates.url = body.url;
  if (body.enabled !== undefined) updates.enabled = body.enabled;

  db.update(schema.mcpServers)
    .set(updates)
    .where(eq(schema.mcpServers.id, serverId))
    .run();

  if (body.enabled === false) {
    await disconnectServer(serverId);
    refreshAllAgentTools();
  } else if (body.enabled === true || body.url !== undefined) {
    try {
      await connectServer(serverId);
      refreshAllAgentTools();
    } catch {
      // connection failed
    }
  }

  const updated = db
    .select()
    .from(schema.mcpServers)
    .where(eq(schema.mcpServers.id, serverId))
    .get()!;

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    url: updated.url,
    authType: updated.authType,
    enabled: updated.enabled,
    connected: isConnected(updated.id),
    discoveredTools: updated.discoveredTools
      ? JSON.parse(updated.discoveredTools)
      : null,
    lastConnectedAt: updated.lastConnectedAt,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const serverId = parseInt(id, 10);

  await disconnectServer(serverId);

  db.delete(schema.mcpServers)
    .where(eq(schema.mcpServers.id, serverId))
    .run();

  refreshAllAgentTools();

  return NextResponse.json({ ok: true });
}
