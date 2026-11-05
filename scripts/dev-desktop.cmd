@echo off
rem Launch the desktop app (Tauri + Vite).
rem DSH's process sandbox can only write inside the workspace, so keep the
rem WebView profile and the note store in repo-local folders for development.
set "ROOT=%~dp0.."
pushd "%ROOT%" || exit /b 1
set "ROOT=%CD%"
popd
set "MAYBE_TODO_DATA_DIR=%ROOT%\.appdata"
set "MAYBE_TODO_WEBVIEW_DIR=%ROOT%\.webview-data"
set "WEBVIEW2_USER_DATA_FOLDER=%ROOT%\.webview-data"
cd /d "%ROOT%"
call npm run desktop