"use client";

import { useState, useEffect, useCallback } from "react";

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  label?: string;
}

export interface McpServerInfo {
  id: number;
  name: string;
  url: string;
  authType: string;
  enabled: boolean;
  connected: boolean;
  discoveredTools: McpToolInfo[] | null;
  lastConnectedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface TestResult {
  success: boolean;
  toolCount?: number;
  tools?: Array<{ name: string; description?: string }>;
  error?: string;
}

export function useMcpServers() {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/mcp/servers");
    const data = await res.json();
    setServers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const addServer = useCallback(
    async (
      name: string,
      url: string,
      authType: string = "none",
      credentials?: Record<string, string>
    ) => {
      const res = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, authType, credentials: credentials ? JSON.stringify(credentials) : undefined }),
      });
      const server = await res.json();
      if (res.ok) {
        setServers((prev) => [...prev, server]);
      }
      return server;
    },
    []
  );

  const updateServer = useCallback(
    async (id: number, updates: Partial<{ name: string; url: string; enabled: boolean }>) => {
      const res = await fetch(`/api/mcp/servers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      if (res.ok) {
        setServers((prev) =>
          prev.map((s) => (s.id === id ? updated : s))
        );
      }
      return updated;
    },
    []
  );

  const deleteServer = useCallback(async (id: number) => {
    await fetch(`/api/mcp/servers/${id}`, { method: "DELETE" });
    setServers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const testConnection = useCallback(
    async (
      url: string,
      authType: string = "none",
      credentials?: Record<string, string>
    ): Promise<TestResult> => {
      const res = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, authType, credentials }),
      });
      return res.json();
    },
    []
  );

  const reconnect = useCallback(
    async (id: number) => {
      return updateServer(id, { enabled: true });
    },
    [updateServer]
  );

  return {
    servers,
    loading,
    addServer,
    updateServer,
    deleteServer,
    testConnection,
    reconnect,
    refetch: fetchServers,
  };
}
