export type SSEWriter = {
  write: (event: string, data: unknown) => void;
  close: () => void;
};

export function createSSEStream(): {
  response: Response;
  writer: SSEWriter;
} {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
    cancel() {
      controller = null;
    },
  });

  const writer: SSEWriter = {
    write(event: string, data: unknown) {
      if (!controller) return;
      try {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      } catch {
        // stream closed
      }
    },
    close() {
      if (!controller) return;
      try {
        controller.close();
      } catch {
        // already closed
      }
      controller = null;
    },
  };

  const response = new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });

  return { response, writer };
}
