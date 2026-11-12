import type { BackgroundStyle } from "../lib/settings";

type DecoratedBackground = Exclude<BackgroundStyle, "none">;

const patternClass: Record<DecoratedBackground, string> = {
  paper: "home-backdrop-dots",
  ruled: "home-backdrop-ruled",
  grid: "home-backdrop-grid",
};

export default function HomeBackdrop({
  variant,
}: {
  variant: DecoratedBackground;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="home-backdrop-glow" />
      <div
        className={`absolute inset-0 ${patternClass[variant]}`}
      />
    </div>
  );
}
