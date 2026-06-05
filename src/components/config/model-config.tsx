"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useConfig, useProviders, useModels } from "@/hooks/use-config";

export function ModelConfig() {
  const { config, updateConfig } = useConfig();
  const { providers, saveApiKey } = useProviders();
  const { models } = useModels(config?.provider ?? null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  if (!config) return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;

  const currentProvider = providers.find((p) => p.id === config.provider);

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    await saveApiKey(config.provider, apiKeyInput.trim(), baseUrlInput || undefined);
    setApiKeyInput("");
    setSavingKey(false);
  };

  const thinkingLevels = ["off", "minimal", "low", "medium", "high", "xhigh"];
  const currentModel = models.find((m) => m.id === config.modelId);

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium">Provider</label>
        <Select
          value={config.provider}
          onValueChange={(value) => {
            if (!value) return;
            updateConfig({ provider: value });
            setApiKeyInput("");
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  {p.id}
                  {p.hasKey && (
                    <Badge variant="secondary" className="text-[10px]">
                      key set
                    </Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">API Key</label>
        <div className="mt-1 flex gap-2">
          <Input
            type="password"
            placeholder={currentProvider?.hasKey ? "Key saved (enter new to replace)" : "Enter API key"}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
          <Button onClick={handleSaveKey} disabled={!apiKeyInput.trim() || savingKey} size="sm">
            Save
          </Button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Base URL (optional)</label>
        <Input
          className="mt-1"
          placeholder="Custom endpoint (e.g., http://localhost:11434/v1)"
          value={baseUrlInput}
          onChange={(e) => setBaseUrlInput(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Model</label>
        <Select
          value={config.modelId}
          onValueChange={(value) => value && updateConfig({ modelId: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex items-center gap-2">
                  <span>{m.name}</span>
                  {m.reasoning && (
                    <Badge variant="outline" className="text-[10px]">
                      reasoning
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentModel && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Context: {(currentModel.contextWindow / 1000).toFixed(0)}k</span>
            <span>In: ${currentModel.cost.input}/M</span>
            <span>Out: ${currentModel.cost.output}/M</span>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Thinking Level</label>
        <Select
          value={config.thinkingLevel}
          onValueChange={(value) => value && updateConfig({ thinkingLevel: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {thinkingLevels.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
