export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative grid size-9 place-items-center rounded-[11px] bg-ink text-paper shadow-sm ${className}`}
    >
      <span className="font-display -translate-y-px text-[20px] italic leading-none">
        m
      </span>
      <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent" />
    </span>
  );
}
