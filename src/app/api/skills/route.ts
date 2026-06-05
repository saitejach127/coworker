import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db/init";
import { getAllSkills, createSkill } from "@/lib/skills/skills-service";
import { parseSkillContent } from "@/lib/skills/skill-parser";
import { refreshAllAgentSkills } from "@/lib/agent/agent-manager";

ensureDb();

export async function GET() {
  const skills = getAllSkills();
  const result = skills.map((s) => {
    const parsed = parseSkillContent(s.content);
    return {
      ...s,
      toolCount: parsed.tools.length,
    };
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, content } = body;

  if (!name || !content) {
    return NextResponse.json(
      { error: "name and content are required" },
      { status: 400 }
    );
  }

  const skill = createSkill(name, description ?? "", content);
  refreshAllAgentSkills();

  const parsed = parseSkillContent(skill.content);
  return NextResponse.json({ ...skill, toolCount: parsed.tools.length });
}
