import { invoke } from "@tauri-apps/api/core";
import { inTauri } from "./runtime";
import type {
  Note,
  NoteContent,
  NotePage,
  NoteSummary,
  NoteType,
} from "../types";
import { summarizeContent } from "./summary";

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

function normalizeNote(value: unknown): Note | null {
  if (!value || typeof value !== "object") return null;
  const note = value as Partial<Note>;
  if (
    typeof note.id !== "string" ||
    (note.type !== "text" && note.type !== "todo") ||
    typeof note.title !== "string" ||
    typeof note.content !== "object" ||
    note.content === null ||
    typeof note.order !== "number" ||
    typeof note.createdAt !== "number" ||
    typeof note.updatedAt !== "number" ||
    (note.trashedAt !== null && typeof note.trashedAt !== "number") ||
    (note.completedAt !== null && typeof note.completedAt !== "number") ||
    typeof note.isLocked !== "boolean"
  ) {
    return null;
  }
  const content = note.content as NoteContent;
  return {
    id: note.id,
    type: note.type,
    title: note.title,
    summary:
      typeof note.summary === "string"
        ? note.summary
        : summarizeContent(note.type, content),
    content,
    order: note.order,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    trashedAt: note.trashedAt ?? null,
    completedAt: note.completedAt ?? null,
    isLocked: note.isLocked,
  };
}

function readAll(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeNote)
      .filter((note): note is Note => note !== null);
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

export function toSummary(note: Note): NoteSummary {
  return {
    id: note.id,
    type: note.type,
    title: note.title,
    summary: note.summary,
    order: note.order,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    trashedAt: note.trashedAt,
    completedAt: note.completedAt,
    isLocked: note.isLocked,
  };
}

function activeSorted(notes: Note[]): Note[] {
  return notes
    .filter((note) => note.trashedAt === null)
    .sort(
      (left, right) =>
        left.order - right.order || left.createdAt - right.createdAt,
    );
}

function trashedSorted(notes: Note[]): Note[] {
  return notes
    .filter((note) => note.trashedAt !== null)
    .sort((left, right) => (right.trashedAt ?? 0) - (left.trashedAt ?? 0));
}

function pageOf(notes: Note[], cursor: string | null, limit: number): NotePage {
  const size = Math.min(Math.max(limit, 1), 200);
  const cursorIndex = cursor
    ? notes.findIndex((note) => note.id === cursor)
    : -1;
  if (cursor && cursorIndex === -1) {
    return { items: [], nextCursor: null, hasMore: false };
  }
  const start = cursor ? cursorIndex + 1 : 0;
  const end = Math.min(start + size, notes.length);
  const slice = start < notes.length ? notes.slice(start, end) : [];
  const hasMore = end < notes.length;
  return {
    items: slice.map(toSummary),
    nextCursor: hasMore && slice.length > 0 ? slice[slice.length - 1].id : null,
    hasMore,
  };
}

function webCreateNote(input: CreateNoteInput): Note {
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
    summary: summarizeContent(input.type, input.content),
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

function webUpdateNote(input: UpdateNoteInput): Note {
  const all = readAll();
  const existing = all.find((note) => note.id === input.id);
  if (!existing) throw new Error("便签不存在");
  const updated: Note = {
    ...existing,
    title: input.title,
    summary: summarizeContent(existing.type, input.content),
    content: input.content,
    completedAt: input.completedAt,
    updatedAt: Date.now(),
  };
  writeAll(all.map((note) => (note.id === updated.id ? updated : note)));
  return updated;
}

function webSetLocked(id: string, locked: boolean): NoteSummary {
  const all = readAll();
  const existing = all.find((note) => note.id === id);
  if (!existing) throw new Error("便签不存在");
  const updated: Note = { ...existing, isLocked: locked };
  writeAll(all.map((note) => (note.id === id ? updated : note)));
  return toSummary(updated);
}

function webTrashNote(id: string): void {
  const all = readAll();
  writeAll(
    all.map((note) =>
      note.id === id && note.trashedAt === null
        ? { ...note, trashedAt: Date.now() }
        : note,
    ),
  );
}

function webRestoreNote(id: string): NoteSummary {
  const all = readAll();
  const existing = all.find((note) => note.id === id);
  if (!existing) throw new Error("便签不存在");
  if (existing.trashedAt === null) return toSummary(existing);
  const active = all.filter((note) => note.trashedAt === null);
  const conflict = active.some((note) => note.order === existing.order);
  const order = conflict
    ? (active.length ? Math.min(...active.map((note) => note.order)) : 0) - 1
    : existing.order;
  const restored: Note = { ...existing, trashedAt: null, order };
  writeAll(all.map((note) => (note.id === id ? restored : note)));
  return toSummary(restored);
}

function webDeleteForever(id: string): void {
  writeAll(readAll().filter((note) => note.id !== id));
}

function webEmptyTrash(): void {
  writeAll(readAll().filter((note) => note.trashedAt === null));
}

function webPurgeExpired(): number {
  const all = readAll();
  const cutoff = Date.now() - RETENTION_MS;
  const kept = all.filter(
    (note) => note.trashedAt === null || note.trashedAt >= cutoff,
  );
  if (kept.length !== all.length) writeAll(kept);
  return all.length - kept.length;
}

/* --------------------------------- public api -------------------------------- */

export async function listSummaries(
  cursor: string | null,
  limit: number,
): Promise<NotePage> {
  if (inTauri) return invoke<NotePage>("list_summaries", { cursor, limit });
  return pageOf(activeSorted(readAll()), cursor, limit);
}

export async function listTrashedSummaries(
  cursor: string | null,
  limit: number,
): Promise<NotePage> {
  if (inTauri) {
    return invoke<NotePage>("list_trashed_summaries", { cursor, limit });
  }
  return pageOf(trashedSorted(readAll()), cursor, limit);
}

export async function getNote(id: string): Promise<Note> {
  if (inTauri) return invoke<Note>("get_note", { id });
  const note = readAll().find((item) => item.id === id);
  if (!note) throw new Error("便签不存在");
  return note;
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

export async function setLocked(
  id: string,
  locked: boolean,
): Promise<NoteSummary> {
  if (inTauri) return invoke<NoteSummary>("set_lock", { id, locked });
  return webSetLocked(id, locked);
}

export async function trashNote(id: string): Promise<void> {
  if (inTauri) {
    await invoke("trash_note", { id });
    return;
  }
  webTrashNote(id);
}

export async function restoreNote(id: string): Promise<NoteSummary> {
  if (inTauri) return invoke<NoteSummary>("restore_note", { id });
  return webRestoreNote(id);
}

export async function deleteNoteForever(id: string): Promise<void> {
  if (inTauri) {
    await invoke("delete_note_forever", { id });
    return;
  }
  webDeleteForever(id);
}

export async function emptyTrash(): Promise<void> {
  if (inTauri) {
    await invoke("empty_trash");
    return;
  }
  webEmptyTrash();
}

export async function purgeExpired(): Promise<number> {
  if (inTauri) return invoke<number>("purge_trash");
  return webPurgeExpired();
}

export async function quitApp(): Promise<void> {
  if (!inTauri) throw new Error("仅桌面端支持退出");
  await invoke("quit_app");
}
