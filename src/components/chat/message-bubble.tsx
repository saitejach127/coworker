"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: string;
  content: unknown;
  stopReason?: string;
  toolCallId?: string;
  toolName?: string;
  isError?: boolean;
}

export function MessageBubble({
  role,
  content,
  toolCallId,
  toolName,
  isError,
}: MessageBubbleProps) {
  if (role === "_tool_executing") {
    const data = content as { toolName: string; args: unknown };
    return (
      <div className="mx-auto max-w-3xl px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Running tool: {data.toolName}
        </div>
      </div>
    );
  }

  if (role === "toolResult") {
    return <ToolResultDisplay content={content} toolName={toolName} isError={isError} />;
  }

  const isUser = role === "user";
  const isAssistant = role === "assistant";

  return (
    <div className="mx-auto max-w-3xl px-4 py-2">
      <div
        className={cn("flex", isUser ? "justify-end" : "justify-start")}
      >
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {isAssistant ? (
            <AssistantContent content={content} />
          ) : (
            <div className="whitespace-pre-wrap text-sm">
              {typeof content === "string"
                ? content
                : renderContentBlocks(content)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssistantContent({ content }: { content: unknown }) {
  if (!Array.isArray(content)) {
    return (
      <div className="whitespace-pre-wrap text-sm">
        {String(content)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {content.map((block, i) => {
        if (block.type === "text") {
          return (
            <div key={i} className="whitespace-pre-wrap text-sm">
              {block.text}
            </div>
          );
        }
        if (block.type === "thinking") {
          return <ThinkingBlock key={i} text={block.thinking} />;
        }
        if (block.type === "toolCall") {
          return (
            <ToolCallBlock
              key={i}
              name={block.name}
              args={block.arguments}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function ThinkingBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-l-2 border-muted-foreground/30 pl-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        Thinking
      </button>
      {expanded && (
        <div className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
          {text}
        </div>
      )}
    </div>
  );
}

function ToolCallBlock({ name, args }: { name: string; args: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-background p-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-xs font-medium"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3 w-3"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        {name}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn("ml-auto h-3 w-3 transition-transform", expanded && "rotate-90")}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
      {expanded && args && (
        <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(args, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ToolResultDisplay({
  content,
  toolName,
  isError,
}: {
  content: unknown;
  toolName?: string;
  isError?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const resultText = extractText(content);

  return (
    <div className="mx-auto max-w-3xl px-4 py-1">
      <div
        className={cn(
          "rounded-lg border p-2 text-xs",
          isError ? "border-destructive/30 bg-destructive/5" : "bg-muted/50"
        )}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2 text-muted-foreground"
        >
          {isError ? "Error" : "Result"}: {toolName}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn("ml-auto h-3 w-3 transition-transform", expanded && "rotate-90")}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        {expanded && (
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs">
            {resultText}
          </pre>
        )}
      </div>
    </div>
  );
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
  }
  if (content && typeof content === "object" && "content" in content) {
    return extractText((content as any).content);
  }
  return JSON.stringify(content, null, 2);
}

function renderContentBlocks(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
  }
  return String(content);
}
