export default function HomeBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="home-backdrop-glow" />
      <div className="home-backdrop-dots absolute inset-0" />
    </div>
  );
}
