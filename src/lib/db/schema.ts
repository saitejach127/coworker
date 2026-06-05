import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const providerConfigs = sqliteTable("provider_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull().unique(),
  apiKey: text("api_key").notNull(),
  baseUrl: text("base_url"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const activeConfig = sqliteTable("active_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull(),
  modelId: text("model_id").notNull(),
  thinkingLevel: text("thinking_level").notNull().default("off"),
  systemPrompt: text("system_prompt")
    .notNull()
    .default("You are a helpful assistant."),
  toolExecutionMode: text("tool_execution_mode").notNull().default("parallel"),
});

export const mcpServers = sqliteTable("mcp_servers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  authType: text("auth_type").notNull().default("none"),
  credentials: text("credentials"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastConnectedAt: integer("last_connected_at", { mode: "number" }),
  discoveredTools: text("discovered_tools"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const skills = sqliteTable("skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  content: text("content").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("New Chat"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"),
  timestamp: integer("timestamp", { mode: "number" }).notNull(),
});
