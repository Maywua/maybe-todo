use serde::Serialize;

#[derive(Serialize)]
struct AppInfo {
    name: &'static str,
    version: &'static str,
    runtime: &'static str,
}

/// 前端用来确认 Tauri 运行时与 Rust 后端已连通的轻量命令。
#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        name: "Maybe Todo",
        version: env!("CARGO_PKG_VERSION"),
        runtime: "tauri",
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
