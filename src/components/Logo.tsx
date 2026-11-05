export default function Logo({
  className = "size-9 rounded-[11px]",
}: {
  className?: string;
}) {
  return (
    <span
      className={`relative grid place-items-center bg-ink text-paper shadow-sm ${className}`}
    >
      <span className="font-display -translate-y-px text-[20px] italic leading-none">
        m
      </span>
      <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent" />
    </span>
  );
}
