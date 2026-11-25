"use client";
import { createContext, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "family" | "single";
type Ctx = { go: (target: Mode) => void };
const ModeCtx = createContext<Ctx | null>(null);

export function useModeTransition(): Ctx {
  const ctx = useContext(ModeCtx);
  if (!ctx) throw new Error("useModeTransition must be used inside ModeTransitionProvider");
  return ctx;
}

export default function ModeTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sweeping, setSweeping] = useState<Mode | null>(null);
  const [token, setToken] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function go(target: Mode) {
    if (timer.current) clearTimeout(timer.current);
    document.cookie = `kalkya_mode=${target}; path=/; max-age=31536000`;
    setToken((t) => t + 1);
    setSweeping(target);

    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const navigateAfter = reduced ? 60 : 380;
    const clearAfter = reduced ? 150 : 320;

    // This component lives in the root layout, so it survives the router.push() below —
    // unlike before, when the overlay was inside the page that was about to unmount.
    timer.current = setTimeout(() => {
      router.push(target === "single" ? "/solo" : "/");
      timer.current = setTimeout(() => setSweeping(null), clearAfter);
    }, navigateAfter);
  }

  return (
    <ModeCtx.Provider value={{ go }}>
      {children}
      {sweeping && <div key={token} className={`mode-sweep mode-sweep-${sweeping}`} aria-hidden="true" />}
    </ModeCtx.Provider>
  );
}
