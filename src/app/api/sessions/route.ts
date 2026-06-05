import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { desc } from "drizzle-orm";

ensureDb();

export async function GET() {
  const rows = db
    .select()
    .from(schema.sessions)
    .orderBy(desc(schema.sessions.updatedAt))
    .all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const now = Date.now();
  const session = {
    id: uuid(),
    name: body.name || "New Chat",
    createdAt: now,
    updatedAt: now,
  };

  db.insert(schema.sessions).values(session).run();
  return NextResponse.json(session, { status: 201 });
}
