"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionData } from "@/types";

interface SessionSidebarProps {
  sessions: SessionData[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onDelete,
}: SessionSidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">Chats</h2>
        <Button variant="ghost" size="icon" onClick={onCreate} className="h-7 w-7">
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
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-muted",
                activeSessionId === session.id && "bg-muted font-medium"
              )}
              onClick={() => onSelect(session.id)}
            >
              <span className="flex-1 truncate">{session.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.id);
                }}
                className="hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:block"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No chats yet. Create one to get started.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
