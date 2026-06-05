import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db/init";
import { getSkill, updateSkill, deleteSkill } from "@/lib/skills/skills-service";
import { parseSkillContent } from "@/lib/skills/skill-parser";
import { refreshAllAgentSkills } from "@/lib/agent/agent-manager";

ensureDb();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const skill = getSkill(parseInt(id, 10));
  if (!skill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = parseSkillContent(skill.content);
  return NextResponse.json({ ...skill, toolCount: parsed.tools.length });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = updateSkill(parseInt(id, 10), body);

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  refreshAllAgentSkills();
  const parsed = parseSkillContent(updated.content);
  return NextResponse.json({ ...updated, toolCount: parsed.tools.length });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteSkill(parseInt(id, 10));
  refreshAllAgentSkills();
  return NextResponse.json({ ok: true });
}
