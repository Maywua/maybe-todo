# Maybe Todo

一个很轻的、本地优先的便签 / 待办应用。当前为 **v0.1 欢迎页骨架**,用于验证 React 前端与 Tauri 桌面壳的联通。

> 先记下来,再决定。

## 技术栈

| 层 | 选型 |
| --- | --- |
| UI | React 19 + TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS v4(`@tailwindcss/vite`) |
| 桌面壳 | Tauri 2(Rust) |
| 移动壳(规划) | Capacitor |

## 目录

```
.
├─ src/                  # React 前端
│  ├─ App.tsx            # 欢迎页:快速记录 + 运行状态
│  ├─ components/        # Logo / StatusCard / FeatureGrid
│  ├─ hooks/useNotes.ts  # 便签状态 + localStorage 持久化
│  └─ lib/runtime.ts     # Tauri 环境探测与 IPC 封装
├─ src-tauri/            # Rust 桌面壳
│  ├─ src/lib.rs         # app_info 命令 + Builder
│  ├─ tauri.conf.json    # 窗口 / 打包配置
│  └─ capabilities/      # v2 权限声明
├─ index.html
└─ vite.config.ts
```

## 开发

```bash
npm install

# 纯浏览器预览(不编译 Rust)
npm run dev            # http://localhost:1420

# 桌面窗口(需要 Rust + MSVC 构建工具)
npm run desktop        # 等价于 tauri dev

# Windows 本机推荐:处理 WebView2 数据目录问题后再启动
npm run desktop:local

# 打包安装包
npm run bundle
```

## 当前已验证

- React 组件渲染、Tailwind v4 样式管线
- 欢迎页交互:回车记录、勾选完成、删除、`⌘K / Ctrl+K` 聚焦
- Tauri 环境探测;桌面端启动时调用 Rust `app_info` 命令并在状态卡显示「Rust 已连接」

## 下一步

1. 用 SQLite(`tauri-plugin-sql`)替换 localStorage,建立 notes 表与迁移
2. 抽出 `packages/platform` 适配层,为 Capacitor 移动端预留通知 / 文件 / 安全存储实现
3. 账号与增量同步(本地优先 + 冲突副本)
4. 图标、应用签名、自动更新

## 说明

- 数据目前仅存于浏览器 `localStorage`(key: `maybe-todo.notes.v1`),清缓存会丢,勿存重要内容。
- `src-tauri` 的 crate 名与 lib 名分别为 `maybe-todo` / `maybe_todo_lib`。

## 本机已知问题:WebView2 数据目录

在部分受管控的 Windows 环境下,WebView2 无法在 `%LOCALAPPDATA%` 或 `%TEMP%` 创建用户数据目录,
`npm run desktop` 会以 `Failed to setup app: 拒绝访问 (os error 5)` 或 `0x800700AA` 退出。

解决办法是显式指定一个可写的用户数据目录,`scripts/dev-desktop.cmd` 已封装:

```bat
set WEBVIEW2_USER_DATA_FOLDER=<可写目录>
call npm run tauri dev
```

普通开发机不需要这一步,直接用 `npm run desktop` 即可。
