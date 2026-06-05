import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { encrypt } from "@/lib/crypto";
import { connectServer, isConnected } from "@/lib/mcp/mcp-client-manager";
import { refreshAllAgentTools } from "@/lib/agent/agent-manager";

ensureDb();

export async function GET() {
  const servers = db.select().from(schema.mcpServers).all();
  const result = servers.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    authType: s.authType,
    enabled: s.enabled,
    connected: isConnected(s.id),
    discoveredTools: s.discoveredTools ? JSON.parse(s.discoveredTools) : null,
    lastConnectedAt: s.lastConnectedAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, url, authType, credentials } = body;

  if (!name || !url) {
    return NextResponse.json(
      { error: "name and url are required" },
      { status: 400 }
    );
  }

  const now = Date.now();
  const result = db
    .insert(schema.mcpServers)
    .values({
      name,
      url,
      authType: authType ?? "none",
      credentials: credentials ? encrypt(credentials) : null,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  if (result.enabled) {
    try {
      await connectServer(result.id);
      refreshAllAgentTools();
    } catch {
      // saved but connection failed — user can retry
    }
  }

  return NextResponse.json({
    id: result.id,
    name: result.name,
    url: result.url,
    authType: result.authType,
    enabled: result.enabled,
    connected: isConnected(result.id),
    discoveredTools: result.discoveredTools
      ? JSON.parse(result.discoveredTools)
      : null,
    lastConnectedAt: result.lastConnectedAt,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  });
}
