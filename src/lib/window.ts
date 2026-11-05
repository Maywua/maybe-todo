import { invoke } from "@tauri-apps/api/core";
import { inTauri } from "./runtime";

export async function minimizeWindow(): Promise<void> {
  if (!inTauri) return;
  await invoke("window_minimize");
}

export async function toggleWindowMaximize(): Promise<boolean> {
  if (!inTauri) return false;
  return invoke<boolean>("window_toggle_maximize");
}

export async function isWindowMaximized(): Promise<boolean> {
  if (!inTauri) return false;
  return invoke<boolean>("window_is_maximized");
}

export async function closeWindow(): Promise<void> {
  if (!inTauri) return;
  await invoke("window_close");
}
