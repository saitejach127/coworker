import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { eq } from "drizzle-orm";
import { getServerTools } from "@/lib/mcp/mcp-client-manager";

ensureDb();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const serverId = parseInt(id, 10);

  const server = db
    .select()
    .from(schema.mcpServers)
    .where(eq(schema.mcpServers.id, serverId))
    .get();

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const liveTools = getServerTools(serverId);
  if (liveTools.length > 0) {
    return NextResponse.json(
      liveTools.map((t) => ({
        name: t.name,
        description: t.description,
        label: t.label,
      }))
    );
  }

  if (server.discoveredTools) {
    return NextResponse.json(JSON.parse(server.discoveredTools));
  }

  return NextResponse.json([]);
}
