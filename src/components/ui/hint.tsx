import { Info } from "lucide-react";

/** The small (i) next to a label, with a hint on hover or keyboard focus. */
export function Hint({ text, side = "top" }: { text: string; side?: "top" | "left" }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" aria-label={text} className="cursor-help text-gray-500 hover:text-gray-800">
        <Info className="h-4 w-4" />
      </button>
      <span
        role="tooltip"
        className={
          "pointer-events-none absolute z-30 hidden w-64 rounded-lg bg-gray-800 px-3 py-2 text-xs font-normal leading-snug text-white shadow-lg group-focus-within:block group-hover:block " +
          (side === "top" ? "bottom-full left-1/2 mb-2 -translate-x-1/2" : "right-full top-1/2 mr-2 -translate-y-1/2")
        }
      >
        {text}
      </span>
    </span>
  );
}
