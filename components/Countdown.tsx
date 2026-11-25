"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

export default function Countdown({ lockAtMs }: { lockAtMs: number }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null); // null until mounted, so server and client markup match

  useEffect(() => {
    let refreshed = false;
    const tick = () => {
      const ms = lockAtMs - Date.now();
      setLeft(ms);
      if (ms <= 0 && !refreshed) { refreshed = true; setTimeout(() => router.refresh(), 800); } // first request after lock time resolves the day
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lockAtMs, router]);

  return (
    <span className="pill" role="timer" aria-live="off">
      <span aria-hidden="true">⏳</span>
      {left === null ? "…" : left <= 0 ? "Locking now" : `Locks in ${fmt(left)}`}
    </span>
  );
}
