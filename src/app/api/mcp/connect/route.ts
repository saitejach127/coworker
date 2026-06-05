import { NextRequest, NextResponse } from "next/server";
import { testConnection } from "@/lib/mcp/mcp-client-manager";
import type { AuthType, McpCredentials } from "@/lib/mcp/mcp-client-manager";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, authType, credentials } = body;

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const result = await testConnection(
    url,
    (authType ?? "none") as AuthType,
    (credentials ?? null) as McpCredentials | null
  );
  return NextResponse.json(result);
}
