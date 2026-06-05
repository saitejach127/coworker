"use client";

import { useState } from "react";
import { useSessions } from "@/hooks/use-sessions";
import { SessionSidebar } from "./session-sidebar";
import { ChatPanel } from "./chat-panel";
import { ConfigPanel } from "@/components/config/config-panel";
import { Button } from "@/components/ui/button";

export function ChatLayout() {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
  } = useSessions();

  const [configOpen, setConfigOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={setActiveSessionId}
        onCreate={() => createSession()}
        onDelete={deleteSession}
      />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2">
          <h1 className="text-sm font-semibold">
            {sessions.find((s) => s.id === activeSessionId)?.name || "Coworker"}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfigOpen(true)}
            className="h-8 w-8"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Button>
        </header>
        <ChatPanel sessionId={activeSessionId} />
      </div>
      <ConfigPanel open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
