mod store;

use serde::Serialize;
use std::path::PathBuf;
use store::Store;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

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

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn window_minimize(window: tauri::WebviewWindow) {
    let _ = window.minimize();
}

#[tauri::command]
fn window_toggle_maximize(window: tauri::WebviewWindow) -> bool {
    let maximized = window.is_maximized().unwrap_or(false);
    if maximized {
        let _ = window.unmaximize();
        false
    } else {
        let _ = window.maximize();
        true
    }
}

#[tauri::command]
fn window_is_maximized(window: tauri::WebviewWindow) -> bool {
    window.is_maximized().unwrap_or(false)
}

#[tauri::command]
fn window_close(window: tauri::WebviewWindow) {
    let _ = window.close();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let database = Store::open(app.handle()).map_err(|err| -> Box<dyn std::error::Error> {
                Box::new(std::io::Error::other(err))
            })?;
            app.manage(database);

            let data_dir = std::env::var_os("MAYBE_TODO_WEBVIEW_DIR")
                .map(PathBuf::from)
                .unwrap_or_else(|| {
                    app.path()
                        .app_local_data_dir()
                        .unwrap_or_else(|_| PathBuf::from("."))
                        .join("webview")
                });
            std::fs::create_dir_all(&data_dir)?;

            WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Maybe Todo")
                .inner_size(1120.0, 820.0)
                .min_inner_size(560.0, 560.0)
                .decorations(false)
                .center()
                .data_directory(data_dir)
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_info,
            quit_app,
            window_minimize,
            window_toggle_maximize,
            window_is_maximized,
            window_close,
            store::list_summaries,
            store::list_all_summaries,
            store::list_trashed_summaries,
            store::get_note,
            store::create_note,
            store::update_note,
            store::set_lock,
            store::reorder_notes,
            store::trash_note,
            store::restore_note,
            store::delete_note_forever,
            store::empty_trash,
            store::purge_trash
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
