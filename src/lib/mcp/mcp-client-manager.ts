import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { StreamableHTTPClientTransportOptions } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Unsafe } from "typebox";
import type { TSchema } from "typebox";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import { db, schema } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";

export type AuthType = "none" | "bearer" | "header" | "oauth-credentials";

export interface BearerCredentials {
  token: string;
}

export interface HeaderCredentials {
  headerName: string;
  headerValue: string;
}

export interface OAuthClientCredentials {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope?: string;
}

export type McpCredentials =
  | BearerCredentials
  | HeaderCredentials
  | OAuthClientCredentials;

async function fetchOAuthAccessToken(creds: OAuthClientCredentials): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });
  if (creds.scope) params.set("scope", creds.scope);

  const res = await fetch(creds.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("OAuth response missing access_token");
  }
  return data.access_token;
}

function buildTransportOptions(
  authType: string,
  credentials: McpCredentials | null
): StreamableHTTPClientTransportOptions | undefined {
  if (authType === "none" || !credentials) return undefined;

  if (authType === "bearer") {
    const { token } = credentials as BearerCredentials;
    return {
      requestInit: {
        headers: { Authorization: `Bearer ${token}` },
      },
    };
  }

  if (authType === "header") {
    const { headerName, headerValue } = credentials as HeaderCredentials;
    return {
      requestInit: {
        headers: { [headerName]: headerValue },
      },
    };
  }

  // oauth-credentials: token is fetched before transport creation
  return undefined;
}

function parseCredentials(authType: string, encrypted: string | null): McpCredentials | null {
  if (authType === "none" || !encrypted) return null;
  try {
    return JSON.parse(decrypt(encrypted));
  } catch {
    return null;
  }
}

interface McpConnection {
  client: Client;
  transport: StreamableHTTPClientTransport;
  tools: AgentTool[];
  serverName: string;
  serverId: number;
}

const connections = new Map<number, McpConnection>();

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function mcpToolToAgentTool(
  serverName: string,
  mcpTool: { name: string; description?: string; inputSchema?: Record<string, unknown> },
  client: Client
): AgentTool {
  const namespacedName = `mcp_${sanitizeName(serverName)}_${mcpTool.name}`;
  const inputSchema = mcpTool.inputSchema ?? { type: "object", properties: {} };
  const parameters: TSchema = Unsafe(inputSchema);

  return {
    name: namespacedName,
    description: mcpTool.description ?? `Tool from MCP server "${serverName}"`,
    label: `${serverName}: ${mcpTool.name}`,
    parameters,
    execute: async (
      toolCallId: string,
      params: unknown
    ): Promise<AgentToolResult<unknown>> => {
      const result = await client.callTool({
        name: mcpTool.name,
        arguments: params as Record<string, unknown>,
      });

      const content = (result.content as Array<{ type: string; text?: string }>)
        ?.map((c) => {
          if (c.type === "text") {
            return { type: "text" as const, text: c.text ?? "" };
          }
          return { type: "text" as const, text: JSON.stringify(c) };
        }) ?? [{ type: "text" as const, text: JSON.stringify(result) }];

      return {
        content,
        details: { toolCallId, serverName, originalResult: result },
      };
    },
  };
}

export async function connectServer(serverId: number): Promise<AgentTool[]> {
  if (connections.has(serverId)) {
    await disconnectServer(serverId);
  }

  const server = db
    .select()
    .from(schema.mcpServers)
    .where(eq(schema.mcpServers.id, serverId))
    .get();

  if (!server) throw new Error(`MCP server ${serverId} not found`);

  const credentials = parseCredentials(server.authType, server.credentials);
  let transportOpts = buildTransportOptions(server.authType, credentials);

  if (server.authType === "oauth-credentials" && credentials) {
    const accessToken = await fetchOAuthAccessToken(credentials as OAuthClientCredentials);
    transportOpts = {
      requestInit: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    };
  }

  const transport = new StreamableHTTPClientTransport(new URL(server.url), transportOpts);
  const client = new Client({ name: "coworker", version: "0.1.0" });

  await client.connect(transport);

  const { tools: mcpTools } = await client.listTools();
  const agentTools = mcpTools.map((t) =>
    mcpToolToAgentTool(server.name, t, client)
  );

  const discoveredTools = JSON.stringify(
    mcpTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }))
  );

  db.update(schema.mcpServers)
    .set({
      lastConnectedAt: Date.now(),
      discoveredTools,
      updatedAt: Date.now(),
    })
    .where(eq(schema.mcpServers.id, serverId))
    .run();

  connections.set(serverId, {
    client,
    transport,
    tools: agentTools,
    serverName: server.name,
    serverId,
  });

  return agentTools;
}

export async function disconnectServer(serverId: number): Promise<void> {
  const conn = connections.get(serverId);
  if (!conn) return;

  try {
    await conn.transport.close();
  } catch {
    // best-effort close
  }
  connections.delete(serverId);
}

export async function testConnection(
  url: string,
  authType: AuthType = "none",
  credentials: McpCredentials | null = null
): Promise<{
  success: boolean;
  toolCount?: number;
  tools?: Array<{ name: string; description?: string }>;
  error?: string;
}> {
  let transport: StreamableHTTPClientTransport | null = null;
  try {
    let transportOpts = buildTransportOptions(authType, credentials);

    if (authType === "oauth-credentials" && credentials) {
      const accessToken = await fetchOAuthAccessToken(credentials as OAuthClientCredentials);
      transportOpts = {
        requestInit: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      };
    }

    transport = new StreamableHTTPClientTransport(new URL(url), transportOpts);
    const client = new Client({ name: "coworker-test", version: "0.1.0" });
    await client.connect(transport);
    const { tools } = await client.listTools();
    await transport.close();
    return {
      success: true,
      toolCount: tools.length,
      tools: tools.map((t) => ({ name: t.name, description: t.description })),
    };
  } catch (err) {
    try {
      await transport?.close();
    } catch {
      // ignore
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getAllConnectedTools(): AgentTool[] {
  const tools: AgentTool[] = [];
  for (const conn of connections.values()) {
    tools.push(...conn.tools);
  }
  return tools;
}

export function getServerTools(serverId: number): AgentTool[] {
  return connections.get(serverId)?.tools ?? [];
}

export function isConnected(serverId: number): boolean {
  return connections.has(serverId);
}

export async function connectAllEnabled(): Promise<void> {
  const servers = db
    .select()
    .from(schema.mcpServers)
    .where(eq(schema.mcpServers.enabled, true))
    .all();

  await Promise.allSettled(
    servers.map((s) => connectServer(s.id))
  );
}

export async function disconnectAll(): Promise<void> {
  const ids = [...connections.keys()];
  await Promise.allSettled(ids.map((id) => disconnectServer(id)));
}
