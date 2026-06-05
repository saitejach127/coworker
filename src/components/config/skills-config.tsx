"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useSkills, type SkillInfo } from "@/hooks/use-skills";

function extractFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const nameMatch = yaml.match(/^name:\s*(.+)$/m);
  const descMatch = yaml.match(/^description:\s*(.+)$/m);
  return {
    name: nameMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim(),
  };
}

function SkillCard({
  skill,
  onToggle,
  onDelete,
  onEdit,
}: {
  skill: SkillInfo;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{skill.name}</span>
            {skill.enabled ? (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] shrink-0">
                disabled
              </Badge>
            )}
            {skill.toolCount > 0 && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                {skill.toolCount} tool{skill.toolCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {skill.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {skill.description}
            </p>
          )}
        </div>
        <Switch checked={skill.enabled} onCheckedChange={onToggle} />
      </div>

      <div className="flex items-center gap-2 text-xs">
        <button
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? "Hide preview" : "Preview"}
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 text-destructive hover:text-destructive ml-auto"
          onClick={onDelete}
        >
          Remove
        </Button>
      </div>

      {showPreview && (
        <pre className="text-[11px] bg-muted/50 rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap">
          {skill.content}
        </pre>
      )}
    </Card>
  );
}

function SkillForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: { name: string; description: string; content: string };
  onSubmit: (name: string, description: string, content: string) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setContent(text);

      const fm = extractFrontmatter(text);
      if (fm.name && !name) setName(fm.name);
      if (fm.description && !description) setDescription(fm.description);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      <Input
        placeholder="Skill name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground">
            Skill content (Markdown)
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => fileRef.current?.click()}
          >
            Upload .md
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.txt,.markdown"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        <Textarea
          placeholder={"---\nname: My Skill\ndescription: What this skill does\n---\n\nSkill instructions here..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onSubmit(name, description, content)}
          disabled={!name.trim() || !content.trim()}
        >
          {submitLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function SkillsConfig() {
  const { skills, loading, addSkill, updateSkill, deleteSkill } = useSkills();
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillInfo | null>(null);

  const handleAdd = async (name: string, description: string, content: string) => {
    await addSkill(name, description, content);
    setShowForm(false);
  };

  const handleEdit = async (name: string, description: string, content: string) => {
    if (!editingSkill) return;
    await updateSkill(editingSkill.id, { name, description, content });
    setEditingSkill(null);
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      {editingSkill ? (
        <div className="space-y-3">
          <label className="text-sm font-medium">Edit Skill</label>
          <SkillForm
            initial={{
              name: editingSkill.name,
              description: editingSkill.description,
              content: editingSkill.content,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingSkill(null)}
            submitLabel="Save Changes"
          />
        </div>
      ) : showForm ? (
        <div className="space-y-3">
          <label className="text-sm font-medium">Add Skill</label>
          <SkillForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            submitLabel="Add Skill"
          />
        </div>
      ) : (
        <Button size="sm" onClick={() => setShowForm(true)}>
          Add Skill
        </Button>
      )}

      {skills.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">
            Skills ({skills.length})
          </label>
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={(enabled) => updateSkill(skill.id, { enabled })}
              onDelete={() => deleteSkill(skill.id)}
              onEdit={() => setEditingSkill(skill)}
            />
          ))}
        </div>
      )}

      {skills.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">
          No skills configured. Skills extend the agent&apos;s system prompt with
          custom instructions, persona, or tool definitions.
        </p>
      )}
    </div>
  );
}
