"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMcpServers, type McpServerInfo, type McpToolInfo } from "@/hooks/use-mcp-servers";

type AuthType = "none" | "bearer" | "header" | "oauth-credentials";

const AUTH_LABELS: Record<AuthType, string> = {
  none: "None",
  bearer: "API Key / Bearer Token",
  header: "Custom Header",
  "oauth-credentials": "OAuth Client Credentials",
};

function AuthFields({
  authType,
  credentials,
  onChange,
}: {
  authType: AuthType;
  credentials: Record<string, string>;
  onChange: (creds: Record<string, string>) => void;
}) {
  if (authType === "none") return null;

  if (authType === "bearer") {
    return (
      <Input
        type="password"
        placeholder="API key or bearer token"
        value={credentials.token ?? ""}
        onChange={(e) => onChange({ token: e.target.value })}
      />
    );
  }

  if (authType === "header") {
    return (
      <div className="flex gap-2">
        <Input
          placeholder="Header name (e.g., X-API-Key)"
          value={credentials.headerName ?? ""}
          onChange={(e) =>
            onChange({ ...credentials, headerName: e.target.value })
          }
          className="flex-1"
        />
        <Input
          type="password"
          placeholder="Header value"
          value={credentials.headerValue ?? ""}
          onChange={(e) =>
            onChange({ ...credentials, headerValue: e.target.value })
          }
          className="flex-1"
        />
      </div>
    );
  }

  if (authType === "oauth-credentials") {
    return (
      <div className="space-y-2">
        <Input
          placeholder="Token URL (e.g., https://auth.example.com/oauth/token)"
          value={credentials.tokenUrl ?? ""}
          onChange={(e) =>
            onChange({ ...credentials, tokenUrl: e.target.value })
          }
        />
        <div className="flex gap-2">
          <Input
            placeholder="Client ID"
            value={credentials.clientId ?? ""}
            onChange={(e) =>
              onChange({ ...credentials, clientId: e.target.value })
            }
            className="flex-1"
          />
          <Input
            type="password"
            placeholder="Client Secret"
            value={credentials.clientSecret ?? ""}
            onChange={(e) =>
              onChange({ ...credentials, clientSecret: e.target.value })
            }
            className="flex-1"
          />
        </div>
        <Input
          placeholder="Scope (optional)"
          value={credentials.scope ?? ""}
          onChange={(e) =>
            onChange({ ...credentials, scope: e.target.value })
          }
        />
      </div>
    );
  }

  return null;
}

function ToolInspector({ tools }: { tools: McpToolInfo[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (tools.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">No tools discovered</p>
    );
  }

  return (
    <div className="space-y-1 mt-2">
      {tools.map((tool) => (
        <div key={tool.name} className="text-xs">
          <button
            className="w-full text-left flex items-center gap-1.5 py-0.5 hover:bg-muted/50 rounded px-1 -mx-1"
            onClick={() =>
              setExpanded(expanded === tool.name ? null : tool.name)
            }
          >
            <span className="font-mono text-[11px]">
              {expanded === tool.name ? "v" : ">"}
            </span>
            <span className="font-medium truncate">{tool.name}</span>
          </button>
          {expanded === tool.name && (
            <div className="ml-4 mt-0.5 mb-1 text-muted-foreground space-y-1">
              {tool.description && <p>{tool.description}</p>}
              {tool.inputSchema && (
                <pre className="text-[10px] bg-muted/50 rounded p-1.5 overflow-x-auto max-h-32">
                  {JSON.stringify(tool.inputSchema, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ServerCard({
  server,
  onToggle,
  onDelete,
  onReconnect,
}: {
  server: McpServerInfo;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  onReconnect: () => void;
}) {
  const [showTools, setShowTools] = useState(false);
  const toolCount = server.discoveredTools?.length ?? 0;

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{server.name}</span>
            {server.connected ? (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                connected
              </Badge>
            ) : server.enabled ? (
              <Badge variant="destructive" className="text-[10px] shrink-0">
                disconnected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] shrink-0">
                disabled
              </Badge>
            )}
            {server.authType !== "none" && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                {AUTH_LABELS[server.authType as AuthType] ?? server.authType}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {server.url}
          </p>
        </div>
        <Switch
          checked={server.enabled}
          onCheckedChange={onToggle}
        />
      </div>

      <div className="flex items-center gap-2 text-xs">
        {toolCount > 0 && (
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowTools(!showTools)}
          >
            {toolCount} tool{toolCount !== 1 ? "s" : ""}
            {showTools ? " (hide)" : " (show)"}
          </button>
        )}
        {server.enabled && !server.connected && (
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onReconnect}>
            Reconnect
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 text-destructive hover:text-destructive ml-auto"
          onClick={onDelete}
        >
          Remove
        </Button>
      </div>

      {showTools && server.discoveredTools && (
        <ToolInspector tools={server.discoveredTools} />
      )}
    </Card>
  );
}

export function McpConfig() {
  const {
    servers,
    loading,
    addServer,
    updateServer,
    deleteServer,
    testConnection,
    reconnect,
  } = useMcpServers();

  const [nameInput, setNameInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [authType, setAuthType] = useState<AuthType>("none");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const resetForm = () => {
    setNameInput("");
    setUrlInput("");
    setAuthType("none");
    setCredentials({});
    setTestResult(null);
  };

  const currentCredentials = authType !== "none" ? credentials : undefined;

  const handleTest = async () => {
    if (!urlInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(urlInput.trim(), authType, currentCredentials);
    setTestResult(
      result.success
        ? `Connected — ${result.toolCount} tool${result.toolCount !== 1 ? "s" : ""} found`
        : `Failed: ${result.error}`
    );
    setTesting(false);
  };

  const handleAdd = async () => {
    if (!nameInput.trim() || !urlInput.trim()) return;
    setAdding(true);
    await addServer(nameInput.trim(), urlInput.trim(), authType, currentCredentials);
    resetForm();
    setAdding(false);
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium">Add MCP Server</label>
        <Input
          placeholder="Server name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
        />
        <Input
          placeholder="Server URL (e.g., http://localhost:3001/mcp)"
          value={urlInput}
          onChange={(e) => {
            setUrlInput(e.target.value);
            setTestResult(null);
          }}
        />

        <div>
          <label className="text-xs font-medium text-muted-foreground">Authentication</label>
          <Select
            value={authType}
            onValueChange={(value) => {
              setAuthType(value as AuthType);
              setCredentials({});
              setTestResult(null);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(AUTH_LABELS) as AuthType[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {AUTH_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AuthFields
          authType={authType}
          credentials={credentials}
          onChange={setCredentials}
        />

        {testResult && (
          <p
            className={`text-xs ${
              testResult.startsWith("Connected")
                ? "text-green-600"
                : "text-destructive"
            }`}
          >
            {testResult}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={!urlInput.trim() || testing}
          >
            {testing ? "Testing..." : "Test"}
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!nameInput.trim() || !urlInput.trim() || adding}
          >
            {adding ? "Adding..." : "Add Server"}
          </Button>
        </div>
      </div>

      {servers.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">
            Servers ({servers.length})
          </label>
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onToggle={(enabled) => updateServer(server.id, { enabled })}
              onDelete={() => deleteServer(server.id)}
              onReconnect={() => reconnect(server.id)}
            />
          ))}
        </div>
      )}

      {servers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No MCP servers configured. Add a server above to connect remote tools.
        </p>
      )}
    </div>
  );
}
