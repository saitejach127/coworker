"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelConfig } from "./model-config";
import { GeneralConfig } from "./general-config";

interface ConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigPanel({ open, onOpenChange }: ConfigPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configuration</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="model" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="mcp">MCP</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          <TabsContent value="model" className="mt-4">
            <ModelConfig />
          </TabsContent>
          <TabsContent value="mcp" className="mt-4">
            <div className="text-sm text-muted-foreground">
              MCP server configuration coming in Phase 2.
            </div>
          </TabsContent>
          <TabsContent value="skills" className="mt-4">
            <div className="text-sm text-muted-foreground">
              Skills configuration coming in Phase 3.
            </div>
          </TabsContent>
          <TabsContent value="general" className="mt-4">
            <GeneralConfig />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
