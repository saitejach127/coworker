export interface ActiveConfigData {
  provider: string;
  modelId: string;
  thinkingLevel: string;
  systemPrompt: string;
  toolExecutionMode: string;
}

export interface ProviderConfigData {
  provider: string;
  apiKey: string;
  baseUrl?: string | null;
}

export interface SessionData {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface MessageData {
  id: string;
  sessionId: string;
  role: string;
  content: unknown;
  metadata?: unknown;
  timestamp: number;
}

export interface McpServerData {
  id: number;
  name: string;
  url: string;
  authType: string;
  enabled: boolean;
  discoveredTools?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SkillData {
  id: number;
  name: string;
  description: string;
  content: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProviderInfo {
  id: string;
  hasKey: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
  reasoning: boolean;
  input: string[];
  cost: {
    input: number;
    output: number;
  };
}

export type SSEEventType =
  | "agent_start"
  | "agent_end"
  | "turn_start"
  | "turn_end"
  | "message_start"
  | "message_update"
  | "message_end"
  | "tool_execution_start"
  | "tool_execution_update"
  | "tool_execution_end"
  | "error";
