"use client";

import { useState, useEffect, useCallback } from "react";

export interface SkillInfo {
  id: number;
  name: string;
  description: string;
  content: string;
  enabled: boolean;
  toolCount: number;
  createdAt: number;
  updatedAt: number;
}

export function useSkills() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSkills = useCallback(async () => {
    const res = await fetch("/api/skills");
    const data = await res.json();
    setSkills(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const addSkill = useCallback(
    async (name: string, description: string, content: string) => {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, content }),
      });
      const skill = await res.json();
      if (res.ok) {
        setSkills((prev) => [...prev, skill]);
      }
      return skill;
    },
    []
  );

  const updateSkill = useCallback(
    async (
      id: number,
      updates: Partial<{ name: string; description: string; content: string; enabled: boolean }>
    ) => {
      const res = await fetch(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      if (res.ok) {
        setSkills((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
      return updated;
    },
    []
  );

  const deleteSkill = useCallback(async (id: number) => {
    await fetch(`/api/skills/${id}`, { method: "DELETE" });
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    skills,
    loading,
    addSkill,
    updateSkill,
    deleteSkill,
    refetch: fetchSkills,
  };
}
