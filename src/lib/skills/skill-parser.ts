import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import { Unsafe } from "typebox";

export interface SkillToolDef {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  returns?: string;
}

export interface ParsedSkill {
  name: string;
  description: string;
  tools: SkillToolDef[];
  body: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

function parseYamlLite(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let currentKey = "";
  let currentArray: unknown[] | null = null;
  let currentObject: Record<string, unknown> | null = null;
  let inNestedObject = false;
  let nestedIndent = 0;

  for (const line of lines) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const arrayItemMatch = line.match(/^(\s+)-\s+(.*)/);
    const nestedKeyMatch = line.match(/^(\s{4,})(\w+):\s*(.*)/);

    if (arrayItemMatch && currentArray) {
      const value = arrayItemMatch[2].trim();
      if (value === "" || value.endsWith(":")) {
        currentObject = {};
        currentArray.push(currentObject);
        inNestedObject = true;
        nestedIndent = arrayItemMatch[1].length + 2;
        if (value.endsWith(":")) {
          const k = value.slice(0, -1);
          currentObject[k] = "";
        }
        continue;
      }
      if (value.startsWith("{") && value.endsWith("}")) {
        currentArray.push(parseInlineObject(value));
      } else {
        const obj = parseInlineMapping(value);
        if (obj) {
          currentObject = obj;
          currentArray.push(currentObject);
          inNestedObject = true;
          nestedIndent = arrayItemMatch[1].length + 2;
        } else {
          currentArray.push(value);
          currentObject = null;
          inNestedObject = false;
        }
      }
      continue;
    }

    if (inNestedObject && currentObject && nestedKeyMatch) {
      const indent = nestedKeyMatch[1].length;
      if (indent >= nestedIndent) {
        const key = nestedKeyMatch[2];
        const val = nestedKeyMatch[3].trim();
        if (val === "") {
          const nested: Record<string, unknown> = {};
          currentObject[key] = nested;
          // We'll handle deeper nesting via simple key collection
        } else {
          currentObject[key] = parseValue(val);
        }
        continue;
      } else {
        inNestedObject = false;
        currentObject = null;
      }
    }

    const topMatch = line.match(/^(\w[\w\s]*):\s*(.*)/);
    if (topMatch) {
      currentKey = topMatch[1].trim();
      const val = topMatch[2].trim();
      if (val === "") {
        currentArray = [];
        result[currentKey] = currentArray;
        currentObject = null;
        inNestedObject = false;
      } else {
        result[currentKey] = parseValue(val);
        currentArray = null;
        currentObject = null;
        inNestedObject = false;
      }
    }
  }

  return result;
}

function parseValue(val: string): unknown {
  if (val === "true") return true;
  if (val === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  if (val.startsWith("{") && val.endsWith("}")) return parseInlineObject(val);
  if (val.startsWith("[") && val.endsWith("]")) {
    return val.slice(1, -1).split(",").map(s => parseValue(s.trim()));
  }
  return val;
}

function parseInlineObject(str: string): Record<string, unknown> {
  const inner = str.slice(1, -1);
  const result: Record<string, unknown> = {};
  for (const pair of inner.split(",")) {
    const [k, ...rest] = pair.split(":");
    if (k && rest.length) {
      result[k.trim()] = parseValue(rest.join(":").trim());
    }
  }
  return result;
}

function parseInlineMapping(str: string): Record<string, unknown> | null {
  if (!str.includes(":")) return null;
  const match = str.match(/^(\w+):\s*(.*)/);
  if (!match) return null;
  return { [match[1]]: parseValue(match[2].trim()) };
}

export function parseSkillContent(content: string): ParsedSkill {
  const fmMatch = content.match(FRONTMATTER_RE);
  if (!fmMatch) {
    return { name: "", description: "", tools: [], body: content.trim() };
  }

  const meta = parseYamlLite(fmMatch[1]);
  const body = fmMatch[2].trim();

  const tools: SkillToolDef[] = [];
  if (Array.isArray(meta.tools)) {
    for (const t of meta.tools) {
      if (t && typeof t === "object" && "name" in t) {
        const def = t as Record<string, unknown>;
        tools.push({
          name: String(def.name),
          description: String(def.description ?? ""),
          parameters: def.parameters as Record<string, unknown> | undefined,
          returns: def.returns ? String(def.returns) : undefined,
        });
      }
    }
  }

  return {
    name: String(meta.name ?? ""),
    description: String(meta.description ?? ""),
    tools,
    body,
  };
}

export function skillToolsToAgentTools(
  skillName: string,
  toolDefs: SkillToolDef[],
  skillBody: string
): AgentTool[] {
  return toolDefs.map((def) => {
    const parameters = Unsafe(
      def.parameters ?? { type: "object", properties: {} }
    );

    return {
      name: `skill_${sanitizeName(skillName)}_${def.name}`,
      description: def.description,
      label: `${skillName}: ${def.name}`,
      parameters,
      execute: async (
        toolCallId: string,
        _params: unknown
      ): Promise<AgentToolResult<unknown>> => {
        const response = def.returns ?? skillBody;
        return {
          content: [{ type: "text" as const, text: response }],
          details: { toolCallId, skillName, toolName: def.name },
        };
      },
    };
  });
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}
