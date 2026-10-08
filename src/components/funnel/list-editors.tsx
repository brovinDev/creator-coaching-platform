"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/** A list of rows the creator can add to (up to `max`) and remove from. `blank` makes a new row. */
function Rows<T>({
  items,
  max,
  blank,
  addLabel,
  onChange,
  render,
}: {
  items: T[];
  max: number;
  blank: () => T;
  addLabel: string;
  onChange: (next: T[]) => void;
  render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="relative rounded-xl border border-gray-200 bg-white p-4">
          <button
            type="button"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="absolute right-2 top-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="space-y-2 pr-6">
            {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, blank()])}>
          <Plus className="h-4 w-4" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

export function TitledList({
  items, max, onChange, addLabel, titleLabel, textLabel,
}: {
  items: { title: string; text: string }[];
  max: number;
  onChange: (n: { title: string; text: string }[]) => void;
  addLabel: string;
  titleLabel: string;
  textLabel: string;
}) {
  return (
    <Rows items={items} max={max} blank={() => ({ title: "", text: "" })} addLabel={addLabel} onChange={onChange}
      render={(x, set) => (
        <>
          <Input placeholder={titleLabel} maxLength={120} value={x.title} onChange={(e) => set({ title: e.target.value })} />
          <Textarea placeholder={textLabel} maxLength={400} rows={2} value={x.text} onChange={(e) => set({ text: e.target.value })} />
        </>
      )}
    />
  );
}

export function StringList({ items, max, onChange, addLabel, placeholder }: { items: string[]; max: number; onChange: (n: string[]) => void; addLabel: string; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((x, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input placeholder={placeholder} maxLength={120} value={x} onChange={(e) => onChange(items.map((y, j) => (j === i ? e.target.value : y)))} />
          <button type="button" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
          <Plus className="h-4 w-4" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

export function TestimonialList({ items, max, onChange }: { items: { name: string; role: string; quote: string }[]; max: number; onChange: (n: { name: string; role: string; quote: string }[]) => void }) {
  return (
    <Rows items={items} max={max} blank={() => ({ name: "", role: "", quote: "" })} addLabel="Add a testimonial" onChange={onChange}
      render={(x, set) => (
        <>
          <Textarea placeholder="What they said" maxLength={400} rows={2} value={x.quote} onChange={(e) => set({ quote: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name" maxLength={80} value={x.name} onChange={(e) => set({ name: e.target.value })} />
            <Input placeholder="Role (optional)" maxLength={80} value={x.role} onChange={(e) => set({ role: e.target.value })} />
          </div>
        </>
      )}
    />
  );
}

export function FaqList({ items, max, onChange }: { items: { q: string; a: string }[]; max: number; onChange: (n: { q: string; a: string }[]) => void }) {
  return (
    <Rows items={items} max={max} blank={() => ({ q: "", a: "" })} addLabel="Add a question" onChange={onChange}
      render={(x, set) => (
        <>
          <Input placeholder="Question" maxLength={120} value={x.q} onChange={(e) => set({ q: e.target.value })} />
          <Textarea placeholder="Answer" maxLength={400} rows={2} value={x.a} onChange={(e) => set({ a: e.target.value })} />
        </>
      )}
    />
  );
}
