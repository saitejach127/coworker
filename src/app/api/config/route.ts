import { NextRequest, NextResponse } from "next/server";
import { getActiveConfig, updateActiveConfig } from "@/lib/config/config-service";

export async function GET() {
  const config = getActiveConfig();
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const updated = updateActiveConfig(body);
  return NextResponse.json(updated);
}
