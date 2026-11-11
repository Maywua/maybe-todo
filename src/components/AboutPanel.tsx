import Logo from "./Logo";

export default function AboutPanel() {
  return (
    <div className="px-6 py-8">
      <div className="flex items-center gap-4">
        <Logo className="size-12 rounded-2xl" />
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">
            Maybe Todo
          </h2>
          <p className="mt-1 text-[12.5px] text-muted">
            本地优先的便签与待办
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-[440px] text-[13px] leading-6 text-ink/70">
        一个很轻的、本地优先的便签 / 待办应用。先记下来，再决定。
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-3">
          <span className="text-[12.5px] text-ink/70">版本</span>
          <span className="text-[12.5px] text-muted">v0.1.0</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-3">
          <span className="text-[12.5px] text-ink/70">数据</span>
          <span className="text-[12.5px] text-muted">仅保存在本机</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[12.5px] text-ink/70">网络同步</span>
          <span className="text-[12.5px] text-muted">未开启</span>
        </div>
      </div>

      <p className="mt-8 text-[11.5px] leading-5 text-muted/70">
        便签、待办和设置都不会上传到服务器。
      </p>
    </div>
  );
}
