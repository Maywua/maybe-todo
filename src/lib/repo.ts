import { invoke } from "@tauri-apps/api/core";
import { inTauri } from "./runtime";
import type { Note, NoteContent, NoteType } from "../types";

const STORAGE_KEY = "maybe-todo.notes.v2";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface CreateNoteInput {
  type: NoteType;
  title: string;
  content: NoteContent;
}

export interface UpdateNoteInput {
  id: string;
  title: string;
  content: NoteContent;
  completedAt: number | null;
}

export function newId(): string {
  const cryptoApi = globalThis.crypto as Crypto & {
    randomUUID?: () => string;
  };
  if (typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------ browser fallback ----------------------------- */

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<Note>;
  return (
    typeof note.id === "string" &&
    (note.type === "text" || note.type === "todo") &&
    typeof note.title === "string" &&
    typeof note.content === "object" &&
    note.content !== null &&
    typeof note.order === "number" &&
    typeof note.createdAt === "number" &&
    typeof note.updatedAt === "number" &&
    (note.trashedAt === null || typeof note.trashedAt === "number") &&
    (note.completedAt === null || typeof note.completedAt === "number") &&
    typeof note.isLocked === "boolean"
  );
}

function readAll(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isNote);
  } catch {
    return [];
  }
}

function writeAll(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    throw new Error("浏览器预览存储已满，请改用桌面端");
  }
}

function sortActive(notes: Note[]): Note[] {
  return [...notes].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.createdAt - right.createdAt;
  });
}

async function webListNotes(): Promise<Note[]> {
  return sortActive(readAll().filter((note) => note.trashedAt === null));
}

async function webListTrashed(): Promise<Note[]> {
  return readAll()
    .filter((note) => note.trashedAt !== null)
    .sort((left, right) => (right.trashedAt ?? 0) - (left.trashedAt ?? 0));
}

async function webCreateNote(input: CreateNoteInput): Promise<Note> {
  const all = readAll();
  const active = all.filter((note) => note.trashedAt === null);
  const minOrder = active.length
    ? Math.min(...active.map((note) => note.order))
    : 0;
  const now = Date.now();
  const note: Note = {
    id: newId(),
    type: input.type,
    title: input.title,
    content: input.content,
    order: minOrder - 1,
    createdAt: now,
    updatedAt: now,
    trashedAt: null,
    completedAt: null,
    isLocked: false,
  };
  writeAll([...all, note]);
  return note;
}

async function webUpdateNote(input: UpdateNoteInput): Promise<Note> {
  const all = readAll();
  const existing = all.find((note) => note.id === input.id);
  if (!existing) throw new Error("便签不存在");
  const updated: Note = {
    ...existing,
    title: input.title,
    content: input.content,
    completedAt: input.completedAt,
    updatedAt: Date.now(),
  };
  writeAll(all.map((note) => (note.id === updated.id ? updated : note)));
  return updated;
}

async function webSetLocked(id: string, locked: boolean): Promise<Note> {
  const all = readAll();
  const existing = all.find((note) => note.id === id);
  if (!existing) throw new Error("便签不存在");
  const updated: Note = { ...existing, isLocked: locked };
  writeAll(all.map((note) => (note.id === id ? updated : note)));
  return updated;
}

async function webReorderNotes(ids: string[]): Promise<void> {
  const all = readAll();
  const positions = new Map(ids.map((id, index) => [id, index]));
  writeAll(
    all.map((note) =>
      positions.has(note.id) && note.trashedAt === null
        ? { ...note, order: positions.get(note.id) as number }
        : note,
    ),
  );
}

async function webTrashNote(id: string): Promise<void> {
  const all = readAll();
  writeAll(
    all.map((note) =>
      note.id === id && note.trashedAt === null
        ? { ...note, trashedAt: Date.now() }
        : note,
    ),
  );
}

async function webRestoreNote(id: string): Promise<Note> {
  const all = readAll();
  const existing = all.find((note) => note.id === id);
  if (!existing) throw new Error("便签不存在");
  if (existing.trashedAt === null) return existing;
  const active = all.filter((note) => note.trashedAt === null);
  const conflict = active.some((note) => note.order === existing.order);
  const order = conflict
    ? (active.length ? Math.min(...active.map((note) => note.order)) : 0) - 1
    : existing.order;
  const restored: Note = { ...existing, trashedAt: null, order };
  writeAll(all.map((note) => (note.id === id ? restored : note)));
  return restored;
}

async function webDeleteForever(id: string): Promise<void> {
  writeAll(readAll().filter((note) => note.id !== id));
}

async function webEmptyTrash(): Promise<void> {
  writeAll(readAll().filter((note) => note.trashedAt === null));
}

async function webPurgeExpired(): Promise<number> {
  const all = readAll();
  const cutoff = Date.now() - RETENTION_MS;
  const kept = all.filter(
    (note) => note.trashedAt === null || note.trashedAt >= cutoff,
  );
  if (kept.length !== all.length) writeAll(kept);
  return all.length - kept.length;
}

/* --------------------------------- public api -------------------------------- */

export async function listNotes(): Promise<Note[]> {
  if (inTauri) return invoke<Note[]>("list_notes");
  return webListNotes();
}

export async function listTrashed(): Promise<Note[]> {
  if (inTauri) return invoke<Note[]>("list_trashed");
  return webListTrashed();
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  if (inTauri) {
    return invoke<Note>("create_note", {
      input: { ...input, id: newId() },
    });
  }
  return webCreateNote(input);
}

export async function updateNote(input: UpdateNoteInput): Promise<Note> {
  if (inTauri) return invoke<Note>("update_note", { input });
  return webUpdateNote(input);
}

export async function setLocked(id: string, locked: boolean): Promise<Note> {
  if (inTauri) return invoke<Note>("set_lock", { id, locked });
  return webSetLocked(id, locked);
}

export async function reorderNotes(ids: string[]): Promise<void> {
  if (inTauri) {
    await invoke("reorder_notes", { ids });
    return;
  }
  await webReorderNotes(ids);
}

export async function trashNote(id: string): Promise<void> {
  if (inTauri) {
    await invoke("trash_note", { id });
    return;
  }
  await webTrashNote(id);
}

export async function restoreNote(id: string): Promise<Note> {
  if (inTauri) return invoke<Note>("restore_note", { id });
  return webRestoreNote(id);
}

export async function deleteNoteForever(id: string): Promise<void> {
  if (inTauri) {
    await invoke("delete_note_forever", { id });
    return;
  }
  await webDeleteForever(id);
}

export async function emptyTrash(): Promise<void> {
  if (inTauri) {
    await invoke("empty_trash");
    return;
  }
  await webEmptyTrash();
}

export async function purgeExpired(): Promise<number> {
  if (inTauri) return invoke<number>("purge_trash");
  return webPurgeExpired();
}

export async function quitApp(): Promise<void> {
  if (!inTauri) throw new Error("仅桌面端支持退出");
  await invoke("quit_app");
}
