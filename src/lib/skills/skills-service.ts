import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { parseSkillContent, skillToolsToAgentTools } from "./skill-parser";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { SkillData } from "@/types";

export function getAllSkills(): SkillData[] {
  return db.select().from(schema.skills).all();
}

export function getSkill(id: number): SkillData | undefined {
  return db
    .select()
    .from(schema.skills)
    .where(eq(schema.skills.id, id))
    .get();
}

export function createSkill(
  name: string,
  description: string,
  content: string
): SkillData {
  const now = Date.now();
  return db
    .insert(schema.skills)
    .values({ name, description, content, enabled: true, createdAt: now, updatedAt: now })
    .returning()
    .get() as SkillData;
}

export function updateSkill(
  id: number,
  updates: Partial<{ name: string; description: string; content: string; enabled: boolean }>
): SkillData | undefined {
  const existing = getSkill(id);
  if (!existing) return undefined;

  db.update(schema.skills)
    .set({ ...updates, updatedAt: Date.now() })
    .where(eq(schema.skills.id, id))
    .run();

  return getSkill(id);
}

export function deleteSkill(id: number): void {
  db.delete(schema.skills).where(eq(schema.skills.id, id)).run();
}

export function getEnabledSkillsPrompt(): string {
  const enabled = db
    .select()
    .from(schema.skills)
    .where(eq(schema.skills.enabled, true))
    .all();

  if (enabled.length === 0) return "";

  const sections = enabled.map((skill) => {
    const parsed = parseSkillContent(skill.content);
    const body = parsed.body || skill.content;
    return `<skill name="${skill.name}">\n${body}\n</skill>`;
  });

  return `\n\n## Active Skills\n\n${sections.join("\n\n")}`;
}

export function getEnabledSkillTools(): AgentTool[] {
  const enabled = db
    .select()
    .from(schema.skills)
    .where(eq(schema.skills.enabled, true))
    .all();

  const tools: AgentTool[] = [];
  for (const skill of enabled) {
    const parsed = parseSkillContent(skill.content);
    if (parsed.tools.length > 0) {
      tools.push(
        ...skillToolsToAgentTools(skill.name, parsed.tools, parsed.body)
      );
    }
  }
  return tools;
}
