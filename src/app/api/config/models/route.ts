import { NextRequest, NextResponse } from "next/server";
import { getModels } from "@earendil-works/pi-ai";

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider");
  if (!provider) {
    return NextResponse.json(
      { error: "provider query param is required" },
      { status: 400 }
    );
  }

  try {
    const models = getModels(provider as never);
    const result = models.map((m) => ({
      id: m.id,
      name: m.name,
      contextWindow: m.contextWindow,
      maxTokens: m.maxTokens,
      reasoning: m.reasoning,
      input: m.input,
      cost: { input: m.cost.input, output: m.cost.output },
    }));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
}
