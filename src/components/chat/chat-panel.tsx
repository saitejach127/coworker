"use client";

import { useChatSession } from "@/hooks/use-chat-session";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

interface ChatPanelProps {
  sessionId: string | null;
}

export function ChatPanel({ sessionId }: ChatPanelProps) {
  const {
    messages,
    streamingContent,
    streamingThinking,
    isStreaming,
    sendMessage,
  } = useChatSession(sessionId);

  if (!sessionId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-muted-foreground">
            Welcome to Coworker
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new chat or select an existing one to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        streamingThinking={streamingThinking}
        isStreaming={isStreaming}
      />
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
