"use client";
import { useModeTransition } from "./ModeTransitionProvider";

export default function ModeToggle({ current }: { current: "family" | "single" }) {
  const { go } = useModeTransition();
  const isSingle = current === "single";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isSingle}
      aria-label={`Currently ${current} mode. Tap to switch to ${isSingle ? "family" : "single"} mode.`}
      className="mode-switch"
      data-on={isSingle ? "true" : undefined}
      onClick={() => go(isSingle ? "family" : "single")}
    >
      <span className="mode-switch-side" data-active={!isSingle ? "true" : undefined}>Family</span>
      <span className="mode-switch-track" aria-hidden="true">
        <span className="mode-switch-knob" />
      </span>
      <span className="mode-switch-side" data-active={isSingle ? "true" : undefined}>Single</span>
    </button>
  );
}
