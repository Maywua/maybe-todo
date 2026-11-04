@echo off
REM 启动桌面端(Tauri + Vite)。
REM 本机的 WebView2 无法在 %LOCALAPPDATA% / %TEMP% 下创建用户数据目录
REM (表现为 "Failed to setup app: 拒绝访问" 或 0x800700AA),
REM 因此把 WEBVIEW2_USER_DATA_FOLDER 指到工作区内的 .webview-data。
REM 普通开发机上可以忽略此脚本,直接用 npm run desktop。

set "ROOT=%~dp0.."
set "WEBVIEW2_USER_DATA_FOLDER=%ROOT%\.webview-data"
cd /d "%ROOT%"
call npm run desktop
