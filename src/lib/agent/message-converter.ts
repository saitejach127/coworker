import { v4 as uuid } from "uuid";
import type { AgentMessage } from "@earendil-works/pi-agent-core";

export interface StoredMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  metadata: string | null;
  timestamp: number;
}

export function agentMessageToStored(
  sessionId: string,
  msg: AgentMessage
): StoredMessage {
  const role = msg.role;
  let content: unknown;
  let metadata: Record<string, unknown> | null = null;

  if (role === "assistant") {
    const am = msg as import("@earendil-works/pi-ai").AssistantMessage;
    content = am.content;
    metadata = {
      stopReason: am.stopReason,
      usage: am.usage,
      model: am.model,
      provider: am.provider,
      api: am.api,
      responseId: am.responseId,
    };
  } else if (role === "toolResult") {
    const tr = msg as import("@earendil-works/pi-ai").ToolResultMessage;
    content = {
      toolCallId: tr.toolCallId,
      toolName: tr.toolName,
      content: tr.content,
      isError: tr.isError,
    };
  } else {
    content = "content" in msg ? msg.content : msg;
  }

  return {
    id: uuid(),
    sessionId,
    role,
    content: JSON.stringify(content),
    metadata: metadata ? JSON.stringify(metadata) : null,
    timestamp: msg.timestamp ?? Date.now(),
  };
}

export function storedToAgentMessage(row: StoredMessage): AgentMessage {
  const parsed = JSON.parse(row.content);

  if (row.role === "user") {
    return {
      role: "user" as const,
      content: parsed,
      timestamp: row.timestamp,
    };
  }

  if (row.role === "assistant") {
    const meta = row.metadata ? JSON.parse(row.metadata) : {};
    return {
      role: "assistant" as const,
      content: parsed,
      stopReason: meta.stopReason ?? "stop",
      usage: meta.usage ?? { input: 0, output: 0, cost: { input: 0, output: 0, total: 0 } },
      model: meta.model ?? "",
      provider: meta.provider ?? "",
      api: meta.api ?? "",
      responseId: meta.responseId,
      timestamp: row.timestamp,
    } satisfies import("@earendil-works/pi-ai").AssistantMessage;
  }

  if (row.role === "toolResult") {
    return {
      role: "toolResult" as const,
      toolCallId: parsed.toolCallId,
      toolName: parsed.toolName,
      content: parsed.content,
      isError: parsed.isError ?? false,
      timestamp: row.timestamp,
    };
  }

  return {
    role: "user" as const,
    content: parsed,
    timestamp: row.timestamp,
  };
}
