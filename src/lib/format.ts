const pad = (value: number) => String(value).padStart(2, "0");

/** 界面展示格式：YY-MM-DD HH:mm（本地时区）。 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getFullYear()).slice(-2)}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatClock(timestamp: number): string {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatDate(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const monthDay = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return sameYear ? monthDay : `${date.getFullYear()}-${monthDay}`;
}

/** 相对时间：刚刚 / X分钟前 / X小时前 / X天前 / 具体日期。 */
export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < 5 * MINUTE) return "刚刚";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}小时前`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}天前`;
  return formatDate(timestamp, now);
}

const segmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("zh-CN", { granularity: "grapheme" })
    : null;

export function graphemes(value: string): string[] {
  if (!segmenter) return Array.from(value);
  return Array.from(segmenter.segment(value), (part) => part.segment);
}

export function graphemeLength(value: string): number {
  return graphemes(value).length;
}

export function cutGraphemes(value: string, max: number): string {
  const parts = graphemes(value);
  return parts.length <= max ? value : parts.slice(0, max).join("");
}

export function daysUntilPurge(trashedAt: number): number {
  const deadline = trashedAt + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)));
}
