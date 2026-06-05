"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/hooks/use-config";

export function GeneralConfig() {
  const { config, updateConfig } = useConfig();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setSystemPrompt(config.systemPrompt);
      setDirty(false);
    }
  }, [config]);

  if (!config) return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium">System Prompt</label>
        <Textarea
          className="mt-1 min-h-[120px]"
          value={systemPrompt}
          onChange={(e) => {
            setSystemPrompt(e.target.value);
            setDirty(true);
          }}
          placeholder="You are a helpful assistant."
        />
        {dirty && (
          <Button
            className="mt-2"
            size="sm"
            onClick={() => {
              updateConfig({ systemPrompt });
              setDirty(false);
            }}
          >
            Save
          </Button>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Tool Execution Mode</label>
        <Select
          value={config.toolExecutionMode}
          onValueChange={(value) => value && updateConfig({ toolExecutionMode: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="parallel">Parallel</SelectItem>
            <SelectItem value="sequential">Sequential</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Parallel executes multiple tool calls concurrently. Sequential runs them one by one.
        </p>
      </div>
    </div>
  );
}
