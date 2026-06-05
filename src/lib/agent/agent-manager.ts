import { Agent } from "@earendil-works/pi-agent-core";
import type { AgentEvent, AgentMessage } from "@earendil-works/pi-agent-core";
import { getModel } from "@earendil-works/pi-ai";
import type { ImageContent, ThinkingLevel } from "@earendil-works/pi-ai";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { getActiveConfig, getDecryptedApiKey } from "@/lib/config/config-service";
import { getAllConnectedTools } from "@/lib/mcp/mcp-client-manager";
import { agentMessageToStored, storedToAgentMessage } from "./message-converter";
import type { SSEWriter } from "@/lib/sse";
import { eq, asc } from "drizzle-orm";

ensureDb();

interface ManagedAgent {
  agent: Agent;
  lastActivity: number;
}

const agents = new Map<string, ManagedAgent>();
const subscribers = new Map<string, Set<SSEWriter>>();

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function broadcastEvent(sessionId: string, event: AgentEvent) {
  const subs = subscribers.get(sessionId);
  if (!subs) return;

  let eventType = event.type;
  let data: unknown = {};

  switch (event.type) {
    case "agent_start":
    case "turn_start":
      data = {};
      break;
    case "agent_end":
      data = {};
      break;
    case "turn_end":
      data = {};
      break;
    case "message_start":
    case "message_end":
      data = { message: serializeMessage(event.message) };
      break;
    case "message_update":
      data = {
        assistantMessageEvent: event.assistantMessageEvent,
      };
      break;
    case "tool_execution_start":
      data = {
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.args,
      };
      break;
    case "tool_execution_end":
      data = {
        toolCallId: event.toolCallId,
        result: event.result,
        isError: event.isError,
      };
      break;
    case "tool_execution_update":
      data = {
        toolCallId: event.toolCallId,
        toolName: event.toolName,
      };
      break;
  }

  for (const writer of subs) {
    writer.write(eventType, data);
  }
}

function serializeMessage(msg: AgentMessage): Record<string, unknown> {
  const m = msg as unknown as Record<string, unknown>;
  return {
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    ...("stopReason" in msg ? { stopReason: m.stopReason } : {}),
    ...("usage" in msg ? { usage: m.usage } : {}),
    ...("toolCallId" in msg ? { toolCallId: m.toolCallId, toolName: m.toolName, isError: m.isError } : {}),
  };
}

function loadSessionMessages(sessionId: string): AgentMessage[] {
  const rows = db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.sessionId, sessionId))
    .orderBy(asc(schema.messages.timestamp))
    .all();

  return rows.map((row) =>
    storedToAgentMessage({
      id: row.id,
      sessionId: row.sessionId,
      role: row.role,
      content: row.content,
      metadata: row.metadata,
      timestamp: row.timestamp,
    })
  );
}

function saveMessage(sessionId: string, msg: AgentMessage): void {
  const stored = agentMessageToStored(sessionId, msg);
  db.insert(schema.messages).values(stored).run();
}

function createAgent(sessionId: string): Agent {
  const config = getActiveConfig();
  const messages = loadSessionMessages(sessionId);

  let model;
  try {
    model = getModel(config.provider as never, config.modelId as never);
  } catch {
    model = getModel("anthropic" as never, "claude-sonnet-4-20250514" as never);
  }

  const agent = new Agent({
    initialState: {
      systemPrompt: config.systemPrompt,
      model,
      thinkingLevel: config.thinkingLevel as ThinkingLevel,
      tools: getAllConnectedTools(),
      messages,
    },
    getApiKey: async (provider: string) => {
      return getDecryptedApiKey(provider) ?? undefined;
    },
    toolExecution: config.toolExecutionMode as "parallel" | "sequential",
  });

  agent.subscribe(async (event: AgentEvent) => {
    broadcastEvent(sessionId, event);

    if (event.type === "message_end") {
      const msg = event.message;
      if (msg.role === "assistant" || msg.role === "toolResult") {
        saveMessage(sessionId, msg);
      }
    }
  });

  return agent;
}

export function getOrCreateAgent(sessionId: string): Agent {
  let managed = agents.get(sessionId);
  if (managed) {
    managed.lastActivity = Date.now();
    return managed.agent;
  }

  const agent = createAgent(sessionId);
  agents.set(sessionId, { agent, lastActivity: Date.now() });
  return agent;
}

export async function sendMessage(
  sessionId: string,
  text: string,
  images?: ImageContent[]
): Promise<void> {
  const agent = getOrCreateAgent(sessionId);
  const managed = agents.get(sessionId)!;
  managed.lastActivity = Date.now();

  const userMessage: AgentMessage = {
    role: "user" as const,
    content: images?.length
      ? [{ type: "text" as const, text }, ...images]
      : text,
    timestamp: Date.now(),
  };

  saveMessage(sessionId, userMessage);
  await agent.prompt(userMessage);
}

export function addSubscriber(sessionId: string, writer: SSEWriter): void {
  let subs = subscribers.get(sessionId);
  if (!subs) {
    subs = new Set();
    subscribers.set(sessionId, subs);
  }
  subs.add(writer);
}

export function removeSubscriber(sessionId: string, writer: SSEWriter): void {
  const subs = subscribers.get(sessionId);
  if (subs) {
    subs.delete(writer);
    if (subs.size === 0) {
      subscribers.delete(sessionId);
    }
  }
}

export function destroyAgent(sessionId: string): void {
  const managed = agents.get(sessionId);
  if (managed) {
    managed.agent.abort();
    agents.delete(sessionId);
  }
  subscribers.delete(sessionId);
}

export function refreshAgentConfig(sessionId: string): void {
  const managed = agents.get(sessionId);
  if (!managed) return;

  const config = getActiveConfig();
  const { agent } = managed;

  try {
    agent.state.model = getModel(config.provider as never, config.modelId as never);
  } catch {
    // keep current model
  }
  agent.state.thinkingLevel = config.thinkingLevel as ThinkingLevel;
  agent.state.systemPrompt = config.systemPrompt;
  agent.toolExecution = config.toolExecutionMode as "parallel" | "sequential";
  agent.state.tools = getAllConnectedTools();
}

export function refreshAllAgentTools(): void {
  const tools = getAllConnectedTools();
  for (const [, managed] of agents) {
    managed.agent.state.tools = tools;
  }
}

// Clean up idle agents periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, managed] of agents) {
    if (now - managed.lastActivity > IDLE_TIMEOUT_MS) {
      destroyAgent(sessionId);
    }
  }
}, 5 * 60 * 1000);
