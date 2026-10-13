"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

export interface ReorderCourse {
  id: string;
  title: string;
  published: boolean;
  services: string[];
}

/** TagMango's "Reorder courses" panel: drag the rows into the order learners should see, then save. */
export function ReorderCoursesPanel({
  courses,
  onClose,
  onSaved,
}: {
  courses: ReorderCourse[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [order, setOrder] = useState(courses);
  const [saving, setSaving] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const dirty = order.some((c, i) => c.id !== courses[i]?.id);

  function moveTo(target: number) {
    const from = dragFrom.current;
    if (from === null || from === target) return;
    setOrder((list) => {
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(target, 0, item);
      return next;
    });
    dragFrom.current = target;
    setDragging(target);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/courses/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: order.map((c) => c.id) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Course order saved");
      await onSaved();
      onClose();
    } catch {
      toast.error("Could not save the order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-full w-full max-w-[750px] flex-col bg-white shadow-2xl">
        <div className="flex h-[100px] shrink-0 items-center justify-between border-b border-gray-200 px-5">
          <div className="flex items-center gap-5">
            <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
              <X className="h-5 w-5 text-black" />
            </button>
            <h2 className="text-[29px] font-semibold text-black">Reorder courses</h2>
          </div>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="h-[48px] cursor-pointer rounded-md bg-indigo-600 px-7 text-lg font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {order.map((c, i) => (
            <div
              key={c.id}
              draggable
              onDragStart={() => {
                dragFrom.current = i;
                setDragging(i);
              }}
              onDragEnter={() => moveTo(i)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={() => {
                dragFrom.current = null;
                setDragging(null);
              }}
              className={`flex cursor-grab items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 active:cursor-grabbing ${
                dragging === i ? "opacity-50" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="flex items-baseline gap-3 text-xl font-semibold text-black">
                  <span className="shrink-0 text-lg font-normal text-gray-500">{String(i + 1).padStart(2, "0")}.</span>
                  <span className="truncate">{c.title}</span>
                </p>
                {c.services.length > 0 && (
                  <p className="mt-2 flex items-center gap-2 pl-[38px] text-lg text-gray-600">
                    <span className="truncate">{c.services[0]}</span>
                    {c.services.length > 1 && (
                      <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-base text-gray-700">+{c.services.length - 1}</span>
                    )}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-semibold uppercase leading-5 ${
                  c.published ? "bg-green-600 text-white" : "bg-[#e6e7ee] text-[#4a4a5a]"
                }`}
              >
                {c.published ? "Published" : "Draft"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
