import { NextRequest, NextResponse } from "next/server";
import { getProviders } from "@earendil-works/pi-ai";
import {
  getAllProviderConfigs,
  saveProviderConfig,
} from "@/lib/config/config-service";

export async function GET() {
  const allProviders = getProviders();
  const saved = getAllProviderConfigs();
  const savedMap = new Map(saved.map((s) => [s.provider, s]));

  const providers = allProviders.map((id) => ({
    id,
    hasKey: savedMap.has(id),
    baseUrl: savedMap.get(id)?.baseUrl ?? null,
  }));

  return NextResponse.json(providers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider, apiKey, baseUrl } = body;

  if (!provider || !apiKey) {
    return NextResponse.json(
      { error: "provider and apiKey are required" },
      { status: 400 }
    );
  }

  saveProviderConfig({ provider, apiKey, baseUrl });
  return NextResponse.json({ ok: true });
}
