import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { eq } from "drizzle-orm";
import { destroyAgent } from "@/lib/agent/agent-manager";

ensureDb();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, id))
    .get();

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  db.update(schema.sessions)
    .set({ name: body.name, updatedAt: Date.now() })
    .where(eq(schema.sessions.id, id))
    .run();

  const updated = db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, id))
    .get();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  destroyAgent(id);

  db.delete(schema.messages)
    .where(eq(schema.messages.sessionId, id))
    .run();
  db.delete(schema.sessions)
    .where(eq(schema.sessions.id, id))
    .run();

  return NextResponse.json({ ok: true });
}
