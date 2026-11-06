import { useEffect, useState } from "react";

const EXIT_MS = 180;

interface Props {
  message: string | null;
}

export default function Toast({ message }: Props) {
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [sequence, setSequence] = useState(0);

  useEffect(() => {
    if (message) {
      setCurrent(message);
      setOpen(true);
      setSequence((value) => value + 1);
      return;
    }

    if (!current) return;

    setOpen(false);
    const timer = window.setTimeout(() => setCurrent(null), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!current) return null;

  return (
    <div
      key={sequence}
      role="status"
      className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper shadow-[0_16px_40px_-16px_rgba(27,26,22,0.7)] ${
        open ? "animate-toast-in" : "animate-toast-out"
      }`}
    >
      {current}
    </div>
  );
}
