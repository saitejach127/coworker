"use client";

import { useState, useEffect, useCallback } from "react";
import type { ActiveConfigData, ProviderInfo, ModelInfo } from "@/types";

export function useConfig() {
  const [config, setConfig] = useState<ActiveConfigData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/config");
    const data = await res.json();
    setConfig(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(async (update: Partial<ActiveConfigData>) => {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const updated = await res.json();
    setConfig(updated);
    return updated;
  }, []);

  return { config, updateConfig, loading, refetch: fetchConfig };
}

export function useProviders() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config/providers")
      .then((res) => res.json())
      .then((data) => {
        setProviders(data);
        setLoading(false);
      });
  }, []);

  const saveApiKey = useCallback(
    async (provider: string, apiKey: string, baseUrl?: string) => {
      await fetch("/api/config/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, baseUrl }),
      });
      setProviders((prev) =>
        prev.map((p) => (p.id === provider ? { ...p, hasKey: true } : p))
      );
    },
    []
  );

  return { providers, saveApiKey, loading };
}

export function useModels(provider: string | null) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider) {
      setModels([]);
      return;
    }
    setLoading(true);
    fetch(`/api/config/models?provider=${encodeURIComponent(provider)}`)
      .then((res) => res.json())
      .then((data) => {
        setModels(data);
        setLoading(false);
      });
  }, [provider]);

  return { models, loading };
}
