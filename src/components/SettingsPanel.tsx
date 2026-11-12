import { inTauri } from "../lib/runtime";
import { PAGE_SIZE_OPTIONS, type Settings } from "../lib/settings";

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onToast: (message: string) => void;
}

export default function SettingsPanel({
  settings,
  onChange,
  onToast,
}: Props) {
  const choosePageSize = (pageSize: number) => {
    if (pageSize === settings.pageSize) return;
    onChange({ ...settings, pageSize });
    onToast(`每页便签数已设为 ${pageSize} 条`);
  };

  return (
    <div className="px-5 py-5">
      <p className="mb-5 text-[12.5px] leading-5 text-muted">
        管理便签分页和本地数据。
      </p>

      <div className="flex flex-col gap-3">
        <section className="rounded-2xl border border-line bg-card/65 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[14px] font-medium">每页便签数</h2>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                决定首页和回收站每次加载的数量，滚动到底部会继续加载。
              </p>
            </div>
            <div
              role="radiogroup"
              aria-label="每页便签数"
              className="flex shrink-0 gap-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((size) => {
                const active = size === settings.pageSize;
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => choosePageSize(size)}
                    className={`cursor-pointer rounded-xl border px-3 py-1.5 text-[12.5px] transition ${
                      active
                        ? "bg-(--theme-dark) text-paper"
                        : "border-line bg-paper text-ink/70 hover:text-ink"
                    }`}
                  >
                    {size} 条
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card/65 p-5">
          <h2 className="text-[14px] font-medium">数据</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Row
              label="存储方式"
              value={inTauri ? "本地数据库" : "浏览器本地存储"}
            />
            <Row label="回收站保留" value="30 天" />
            <Row label="网络同步" value="未开启" />
          </div>
          <p className="mt-4 border-t border-line/70 pt-3 text-[11.5px] leading-5 text-muted">
            便签、待办和设置都只保存在本机，不会上传到服务器。
          </p>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12.5px] text-ink/70">{label}</span>
      <span className="text-[12.5px] text-muted">{value}</span>
    </div>
  );
}
