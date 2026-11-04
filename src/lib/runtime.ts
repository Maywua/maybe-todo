export const inTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export type AppInfo = {
  name: string;
  version: string;
  runtime: string;
};

export async function getAppInfo(): Promise<AppInfo> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<AppInfo>("app_info");
}
