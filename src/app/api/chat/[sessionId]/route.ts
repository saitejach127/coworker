import { NextRequest } from "next/server";
import { createSSEStream } from "@/lib/sse";
import {
  addSubscriber,
  removeSubscriber,
  getOrCreateAgent,
} from "@/lib/agent/agent-manager";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  // Ensure agent exists
  getOrCreateAgent(sessionId);

  const { response, writer } = createSSEStream();

  writer.write("connected", { sessionId });

  addSubscriber(sessionId, writer);

  // Clean up on disconnect — the response body stream fires cancel when the client drops
  _req.signal.addEventListener("abort", () => {
    removeSubscriber(sessionId, writer);
    writer.close();
  });

  return response;
}
