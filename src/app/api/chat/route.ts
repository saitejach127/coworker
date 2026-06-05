import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/agent/agent-manager";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, text, images } = body;

  if (!sessionId || !text) {
    return NextResponse.json(
      { error: "sessionId and text are required" },
      { status: 400 }
    );
  }

  const session = db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .get();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  db.update(schema.sessions)
    .set({ updatedAt: Date.now() })
    .where(eq(schema.sessions.id, sessionId))
    .run();

  sendMessage(sessionId, text, images).catch((err) => {
    console.error(`Error in sendMessage for session ${sessionId}:`, err);
  });

  return NextResponse.json({ ok: true });
}
