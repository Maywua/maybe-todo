import { useCallback, useEffect, useState } from "react";

export type Note = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
};

const STORAGE_KEY = "maybe-todo.notes.v1";

const seedNotes: Note[] = [
  {
    id: "seed-1",
    text: "把 maybe-todo 的欢迎页跑通",
    done: true,
    createdAt: Date.now() - 86_400_000,
  },
  {
    id: "seed-2",
    text: "按 ⌘K / Ctrl+K 聚焦输入框,回车记一条",
    done: false,
    createdAt: Date.now() - 3_600_000,
  },
];

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isNote(value: unknown): value is Note {
  if (typeof value !== "object" || value === null) return false;
  const note = value as Partial<Note>;
  return (
    typeof note.id === "string" &&
    typeof note.text === "string" &&
    typeof note.done === "boolean"
  );
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedNotes;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedNotes;
    const notes = parsed.filter(isNote);
    return notes;
  } catch {
    return seedNotes;
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // 隐私模式或配额不足时静默忽略,页面仍可正常使用
    }
  }, [notes]);

  const add = useCallback((text: string) => {
    setNotes((prev) =>
      [
        { id: createId(), text, done: false, createdAt: Date.now() },
        ...prev,
      ].slice(0, 200),
    );
  }, []);

  const toggle = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, done: !note.done } : note,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  return { notes, add, toggle, remove };
}
