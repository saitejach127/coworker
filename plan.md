# Coworker — AI Agent Web App

## Context

Building a single-user AI agent web app ("Coworker") using `@earendil-works/pi-agent-core` (stateful agent with tool execution) and `@earendil-works/pi-ai` (unified LLM API with 25+ providers). The app needs configurable model/provider selection, MCP server integration for remote tools, and a skills system — all surfaced through a polished chat UI with multiple sessions. Single-user now, structured for multi-user later.

## Tech Stack

- **Next.js** (App Router) — full-stack React
- **SQLite** via better-sqlite3 + Drizzle ORM — file-based, no setup, desktop-ready
- **Tailwind + shadcn/ui** — fast, polished UI
- **SSE** for streaming agent events to the browser

## Architecture

```
Browser (React)                          Server (Next.js API routes)
┌──────────────────────┐                ┌──────────────────────────────┐
│ Chat UI              │  SSE stream    │ AgentManager                 │
│ ├─ Session tabs      │◄──────────────│ ├─ Map<sessionId, Agent>     │
│ ├─ Message list      │                │ ├─ Agent (pi-agent-core)     │
│ ├─ Streaming display │  POST /chat    │ │  ├─ model (pi-ai)          │
│ └─ Chat input        │───────────────►│ │  ├─ tools (merged)         │
│                      │                │ │  └─ getApiKey callback     │
│ Config Panel         │  REST APIs     │ ├─ McpClientManager          │
│ ├─ Model tab         │◄─────────────►│ │  └─ MCP tools → AgentTool  │
│ ├─ MCP tab           │                │ ├─ SkillService              │
│ ├─ Skills tab        │                │ └─ ConfigService             │
│ └─ General tab       │                │                              │
└──────────────────────┘                │ SQLite (Drizzle ORM)         │
                                        └──────────────────────────────┘
```

**Key decision: Use `Agent` class directly**, not `AgentHarness`. AgentHarness couples to filesystem/JSONL session storage designed for CLI. We manage our own persistence in SQLite.

## Database Schema (Drizzle)

| Table | Key Columns | Notes |
|-------|------------|-------|
| `provider_configs` | provider (unique), api_key (encrypted), base_url | One row per provider with a saved key |
| `active_config` | provider, model_id, thinking_level, system_prompt, tool_execution_mode | Single row for active agent config |
| `mcp_servers` | name, url, auth_type, credentials (encrypted), enabled, discovered_tools (JSON cache) | Remote MCP server configs |
| `skills` | name, description, content (full .md), enabled | Uploaded skill files |
| `sessions` | id (UUID), name, created_at | Chat sessions |
| `messages` | id, session_id (FK), role, content (JSON), metadata (JSON), timestamp | Full message content stored as JSON |

All tables are ready for a `user_id` column when multi-user is added.

## Core Server Components

### AgentManager (`src/lib/agent/agent-manager.ts`)
- `Map<sessionId, Agent>` — lazy-initialized, recreated from DB on cold access
- `getOrCreateAgent(sessionId)` — loads config, messages, tools; creates Agent instance
- `sendMessage(sessionId, text, images?)` — saves user msg to DB, calls `agent.prompt()`, saves assistant response on `agent_end`
- `addSSESubscriber / removeSSESubscriber` — manages per-session SSE writers
- Agent subscribe callback broadcasts events to all SSE subscribers for that session
- Idle timeout destroys agents after 30min inactivity

### McpClientManager (`src/lib/mcp/mcp-client-manager.ts`)
- Uses `@modelcontextprotocol/sdk` `StreamableHTTPClientTransport` for HTTP/SSE connections
- Connects to each enabled server, calls `client.listTools()`
- Converts each MCP tool to `AgentTool` using `Type.Unsafe(jsonSchema)` as the TypeBox bridge
- Tool names namespaced: `mcp_{serverName}_{toolName}` to avoid collisions
- Proxied `execute`: calls `client.callTool()` on the MCP server

### SSE Streaming (`GET /api/chat/[sessionId]`)
- Returns `ReadableStream` as SSE response
- Registers writer with AgentManager
- Events: `agent_start`, `message_start`, `message_update` (with delta), `message_end`, `tool_execution_start/end`, `agent_end`
- User sends messages via `POST /api/chat` (fire-and-forget, response streams via SSE)

### Config Integration
- `getProviders()` and `getModels(provider)` from pi-ai populate UI dropdowns
- `getModel(provider, modelId)` creates the Model instance for the Agent
- API keys resolved via `getApiKey` callback, decrypted from SQLite at call time
- Config changes applied to live agents: `agent.state.model = newModel`, `agent.state.thinkingLevel = newLevel`

## API Routes

| Route | Purpose |
|-------|---------|
| `GET/POST /api/sessions` | List / create sessions |
| `GET/PATCH/DELETE /api/sessions/[id]` | Session CRUD |
| `GET /api/messages/[sessionId]` | Load message history |
| `POST /api/chat` | Send message `{ sessionId, text, images? }` |
| `GET /api/chat/[sessionId]` | SSE event stream |
| `GET/PUT /api/config` | Active agent config |
| `GET /api/config/providers` | Available providers (from pi-ai) |
| `POST /api/config/providers` | Save API key for provider |
| `GET /api/config/models?provider=X` | Models for provider (from pi-ai) |
| `GET/POST /api/mcp/servers` | MCP server list / add |
| `PATCH/DELETE /api/mcp/servers/[id]` | Update / remove server |
| `GET /api/mcp/servers/[id]/tools` | Discovered tools |
| `POST /api/mcp/connect` | Test connection |
| `GET/POST /api/skills` | Skills list / upload |
| `PATCH/DELETE /api/skills/[id]` | Update / remove skill |

## UI Components

```
ChatLayout
├── SessionSidebar (left) — session tabs, new/delete
├── ChatPanel (center)
│   ├── MessageList → MessageBubble (text, ThinkingDisplay, ToolCallDisplay)
│   ├── StreamingIndicator
│   └── ChatInput (textarea + send + image attach)
└── ConfigPanel (right slide-over, shadcn Sheet)
    └── Tabs: ModelConfig | McpConfig | SkillsConfig | GeneralConfig
```

## Build Order

### Phase 1: Config + Core Chat
1. **Scaffold**: `create-next-app`, install deps, init shadcn/ui
2. **Database**: schema, Drizzle setup, crypto util for key encryption
3. **Config service + routes**: CRUD for config, provider/model list endpoints using pi-ai
4. **Agent manager**: factory, message converter, in-memory map, SSE helper
5. **Chat routes**: POST send, GET SSE stream, session/message CRUD
6. **Chat UI**: layout, sidebar, message list, streaming, chat input
7. **Config UI**: model tab (provider/model/key/thinking), general tab (system prompt, tool mode)

### Phase 2: MCP Integration
1. MCP client manager with StreamableHTTPClientTransport
2. Tool adapter (MCP tool → AgentTool with `Type.Unsafe()`)
3. Tool merging into agent on connect/disconnect
4. MCP CRUD routes + connection testing
5. MCP config UI with server cards and tool inspector

### Phase 3: Skills System
1. Skill parser (YAML frontmatter + markdown body + optional tool defs)
2. System prompt injection for enabled skills
3. Skill CRUD routes
4. Skills config UI (upload, preview, enable/disable)

### Phase 4: Desktop (future)
- Wrap in Tauri, OS keychain for creds, native file tools

## Verification

After Phase 1:
- Configure Anthropic provider with API key → model list populates
- Create a new chat session → send a message → see streamed response with thinking blocks
- Switch model mid-conversation → next response uses new model
- Create multiple sessions → switch between them, history persists

After Phase 2:
- Add a remote MCP server → tools discovered and listed
- Send a message that triggers an MCP tool → tool executes, result displayed
- Disable server → tools removed from agent

After Phase 3:
- Upload a skill.md → preview parses correctly
- Enable skill → system prompt updated, skill tools available in chat