"use client";

import { useEffect, useRef } from "react";

/** Six boxes for the emailed code. Typing moves along, pasting fills them all, Enter submits. */
export function CodeInput({
  digits,
  onChange,
  onSubmit,
}: {
  digits: string[];
  onChange: (next: string[]) => void;
  onSubmit?: () => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  function put(index: number, value: string) {
    const only = value.replace(/\D/g, "");
    if (only.length > 1) {
      // A paste (or autofill) of several digits fills the boxes from here.
      const next = [...digits];
      only.slice(0, 6 - index).split("").forEach((d, i) => (next[index + i] = d));
      onChange(next);
      refs.current[Math.min(index + only.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = only;
    onChange(next);
    if (only && index < 5) refs.current[index + 1]?.focus();
  }

  return (
    <div className="flex justify-center gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={6}
          value={digit}
          onChange={(e) => put(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "Enter") onSubmit?.();
          }}
          onPaste={(e) => {
            e.preventDefault();
            put(0, e.clipboardData.getData("text"));
          }}
          className="h-14 w-12 rounded-lg border-2 border-gray-300 text-center text-xl font-bold transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ))}
    </div>
  );
}

export const emptyCode = () => ["", "", "", "", "", ""];
