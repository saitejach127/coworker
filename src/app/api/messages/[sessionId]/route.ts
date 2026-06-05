import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { eq, asc } from "drizzle-orm";
import { storedToAgentMessage } from "@/lib/agent/message-converter";

ensureDb();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const rows = db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.sessionId, sessionId))
    .orderBy(asc(schema.messages.timestamp))
    .all();

  const messages = rows.map((row) =>
    storedToAgentMessage({
      id: row.id,
      sessionId: row.sessionId,
      role: row.role,
      content: row.content,
      metadata: row.metadata,
      timestamp: row.timestamp,
    })
  );

  return NextResponse.json(messages);
}
