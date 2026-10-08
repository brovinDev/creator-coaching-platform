"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchSelectOption {
  value: string;
  label: string;
  /** Shown on the right of the row, e.g. a price. */
  hint?: string;
}

/**
 * Pick one option from a searchable list. Same look as the multi-select in the workshop form:
 * a field with a chevron that opens a panel with a search box and plain rows (no checkboxes).
 */
export function SearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder = "Search by name",
  emptyText = "Nothing to choose from yet",
}: {
  label?: string;
  value: string;
  options: SearchSelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const chosen = options.find((o) => o.value === value);
  const shown = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = () => {
    setQuery("");
    setOpen((v) => !v);
  };

  return (
    <div>
      {label && <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>}
      <div className="relative" ref={ref}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onClick={toggle}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}
          className="flex min-h-[50px] w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <span className={cn("min-w-0 flex-1 truncate", chosen ? "text-gray-900" : "text-gray-500")}>{chosen ? chosen.label : placeholder}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-500 transition-transform", open && "rotate-180")} />
        </div>

        {open && (
          <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            {options.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">{emptyText}</p>
            ) : (
              <>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <div className="max-h-56 space-y-0.5 overflow-y-auto">
                  {shown.length === 0 && <p className="p-2 text-center text-sm text-gray-400">No match</p>}
                  {shown.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50",
                        o.value === value && "bg-indigo-50 font-medium text-indigo-700"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      {o.hint && <span className="shrink-0 text-xs text-gray-500">{o.hint}</span>}
                      {o.value === value && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
