import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(".appdata-pagination");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const now = Date.now();
const lines = ["第一行内容", "第二行内容", "第三行内容", "第四行内容", "第五行内容", "第六行内容"].join("\n");
const notes = Array.from({ length: 100 }, (_, index) => ({
  id: `page-test-${String(index + 1).padStart(3, "0")}`,
  type: "text",
  title: `分页测试 ${String(index + 1).padStart(3, "0")}`,
  content: { version: 1, format: "plain", text: lines },
  order: index,
  createdAt: now - (100 - index) * 60_000,
  updatedAt: now - (100 - index) * 60_000,
  trashedAt: null,
  completedAt: null,
  isLocked: false,
}));

fs.writeFileSync(
  path.join(dir, "maybe-todo.json"),
  JSON.stringify({ version: 1, notes }, null, 2),
  "utf8",
);
console.log(`seeded ${notes.length} notes at ${dir}`);
