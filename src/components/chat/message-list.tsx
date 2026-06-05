"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";

interface Message {
  role: string;
  content: unknown;
  timestamp?: number;
  stopReason?: string;
  toolCallId?: string;
  toolName?: string;
  isError?: boolean;
}

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  streamingThinking: string;
  isStreaming: boolean;
}

export function MessageList({
  messages,
  streamingContent,
  streamingThinking,
  isStreaming,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <ScrollArea className="flex-1">
      <div className="py-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center py-20">
            <p className="text-muted-foreground">
              Start a conversation by typing a message below.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={`${msg.role}-${msg.timestamp}-${i}`}
            role={msg.role}
            content={msg.content}
            stopReason={msg.stopReason}
            toolCallId={msg.toolCallId}
            toolName={msg.toolName}
            isError={msg.isError}
          />
        ))}
        {isStreaming && (streamingContent || streamingThinking) && (
          <div className="mx-auto max-w-3xl px-4 py-2">
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5">
                {streamingThinking && (
                  <div className="mb-2 border-l-2 border-muted-foreground/30 pl-3">
                    <span className="text-xs text-muted-foreground">
                      Thinking...
                    </span>
                  </div>
                )}
                {streamingContent && (
                  <div className="whitespace-pre-wrap text-sm">
                    {streamingContent}
                    <span className="inline-block h-4 w-1 animate-pulse bg-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {isStreaming && !streamingContent && !streamingThinking && (
          <div className="mx-auto max-w-3xl px-4 py-2">
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl bg-muted px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
