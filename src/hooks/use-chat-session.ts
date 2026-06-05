"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ChatMessage {
  role: string;
  content: unknown;
  timestamp?: number;
  stopReason?: string;
  usage?: unknown;
  toolCallId?: string;
  toolName?: string;
  isError?: boolean;
}

export function useChatSession(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [streamingThinking, setStreamingThinking] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load message history
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    fetch(`/api/messages/${sessionId}`)
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch(() => setMessages([]));
  }, [sessionId]);

  // Connect to SSE
  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/chat/${sessionId}`);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setIsConnected(true);
    });

    es.addEventListener("agent_start", () => {
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingThinking("");
    });

    es.addEventListener("agent_end", () => {
      setIsStreaming(false);
      setStreamingContent("");
      setStreamingThinking("");
    });

    es.addEventListener("message_start", (e) => {
      const data = JSON.parse(e.data);
      if (data.message?.role === "user") {
        setMessages((prev) => [...prev, data.message]);
      }
    });

    es.addEventListener("message_update", (e) => {
      const data = JSON.parse(e.data);
      const evt = data.assistantMessageEvent;
      if (evt?.type === "text_delta") {
        setStreamingContent((prev) => prev + evt.delta);
      } else if (evt?.type === "thinking_delta") {
        setStreamingThinking((prev) => prev + evt.delta);
      }
    });

    es.addEventListener("message_end", (e) => {
      const data = JSON.parse(e.data);
      if (data.message?.role === "assistant") {
        setMessages((prev) => [...prev, data.message]);
        setStreamingContent("");
        setStreamingThinking("");
      } else if (data.message?.role === "toolResult") {
        setMessages((prev) => [...prev, data.message]);
      }
    });

    es.addEventListener("tool_execution_start", (e) => {
      const data = JSON.parse(e.data);
      setMessages((prev) => [
        ...prev,
        {
          role: "_tool_executing",
          content: { toolName: data.toolName, toolCallId: data.toolCallId, args: data.args },
          timestamp: Date.now(),
        },
      ]);
    });

    es.addEventListener("tool_execution_end", (e) => {
      const data = JSON.parse(e.data);
      setMessages((prev) =>
        prev.filter(
          (m) =>
            m.role !== "_tool_executing" ||
            (m.content as any)?.toolCallId !== data.toolCallId
        )
      );
    });

    es.addEventListener("error", () => {
      setIsStreaming(false);
    });

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sessionId || !text.trim()) return;

      // Optimistic: add user message immediately
      const userMsg: ChatMessage = {
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text }),
      });
    },
    [sessionId]
  );

  return {
    messages,
    streamingContent,
    streamingThinking,
    isStreaming,
    isConnected,
    sendMessage,
  };
}
