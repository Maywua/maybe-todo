export type NoteType = "text" | "todo";
export type View = "home" | "trash";

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  doneAt: number | null;
}

export interface NoteContent {
  version: number;
  format: string;
  text?: string;
  items?: TodoItem[];
}

export interface Note {
  id: string;
  type: NoteType;
  title: string;
  content: NoteContent;
  order: number;
  createdAt: number;
  updatedAt: number;
  trashedAt: number | null;
  completedAt: number | null;
  isLocked: boolean;
}

export function emptyContent(type: NoteType): NoteContent {
  return type === "text"
    ? { version: 1, format: "plain", text: "" }
    : { version: 1, format: "checklist", items: [] };
}
