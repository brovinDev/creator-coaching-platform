"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, MessageSquare, Search, X } from "lucide-react";
import { MdOutlineInbox } from "react-icons/md";
import toast from "react-hot-toast";
import { DateBox } from "@/components/creator/course-drip-tab";
import { Avatar, ThreadPanel } from "@/components/creator/course-comments-tab";

interface Row {
  id: string;
  courseId: string;
  content: string;
  userName: string;
  userAvatar: string | null;
  courseTitle: string;
  chapterTitle: string;
  createdAt: string | null;
  isRead: boolean;
}

type Filter = "all" | "unread" | "read";

const pad = (n: number) => String(n).padStart(2, "0");
const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const COLS = "grid-cols-[60px_minmax(320px,1.6fr)_minmax(200px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_110px]";

/** Comments on all of the creator's courses in one list. */
export default function CoursesCommentsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [failed, setFailed] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Row | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/courses/comments")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { courses: { id: string; title: string }[]; comments: Row[] }) => {
        if (cancelled) return;
        setRows(data.comments);
        setCourses(data.courses);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadTotal = (rows ?? []).filter((r) => !r.isRead).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (courseId && r.courseId !== courseId) return false;
      if (filter === "unread" && r.isRead) return false;
      if (filter === "read" && !r.isRead) return false;
      if (q && !r.courseTitle.toLowerCase().includes(q)) return false;
      if (r.createdAt) {
        const day = localDay(r.createdAt);
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      return true;
    });
  }, [rows, courseId, query, filter, from, to]);

  const allSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const noneSelected = selected.size === 0;

  function setReadLocal(ids: string[], read: boolean) {
    const set = new Set(ids);
    setRows((list) => (list ?? []).map((r) => (set.has(r.id) ? { ...r, isRead: read } : r)));
  }

  async function markSelected(read: boolean) {
    const ids = [...selected];
    if (ids.length === 0) return;
    const res = await fetch("/api/courses/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, read }),
    });
    if (!res.ok) return toast.error("Could not update the comments");
    setReadLocal(ids, read);
    setSelected(new Set());
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: unreadTotal > 0 ? `Unread (${unreadTotal})` : "Unread" },
    { key: "read", label: "Read" },
  ];

  return (
    <div className="mx-auto max-w-[1280px]" style={{ zoom: 0.8, fontFamily: "var(--font-poppins), sans-serif" }}>
      <Link href="/creator/courses" className="flex w-fit items-center gap-2 text-lg text-[#1d86ff] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </Link>
      <h1 className="mt-1 text-[40px] font-semibold leading-tight text-black">Courses Comments</h1>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="relative w-[142px]">
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            aria-label="Course"
            className="h-[50px] w-full cursor-pointer appearance-none rounded-md border border-gray-200 bg-white px-4 pr-9 text-lg text-black focus:border-gray-400 focus:outline-none"
          >
            <option value="">Course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-700" />
        </div>
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-800" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course title"
            className="h-[50px] w-full rounded-md border border-gray-200 bg-white pl-12 pr-4 text-lg text-black placeholder:text-gray-600 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div className="flex h-[50px] items-center rounded-md border border-gray-200 bg-white px-1">
          <DateBox value={from} onChange={setFrom} allowPast bare placeholder="Start date" />
          <span className="text-gray-500">&rarr;</span>
          <DateBox value={to} onChange={setTo} allowPast bare placeholder="End date" />
          {(from || to) && (
            <button onClick={() => { setFrom(""); setTo(""); }} aria-label="Clear dates" className="mr-2 cursor-pointer text-gray-500 hover:text-black">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`h-[42px] cursor-pointer rounded-full border px-6 text-lg text-black ${
                filter === f.key ? "border-2 border-indigo-600 font-medium" : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {[
            { read: true, label: "Mark as read" },
            { read: false, label: "Mark as unread" },
          ].map((b) => (
            <button
              key={b.label}
              onClick={() => markSelected(b.read)}
              disabled={noneSelected}
              className="flex h-[42px] cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-5 text-lg text-black hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white"
            >
              <MessageSquare className="h-4 w-4" /> {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="min-w-[1100px]">
          <div className={`grid ${COLS} items-center border-b border-gray-200 bg-gray-50 text-lg text-black`}>
            <div className="flex items-center justify-center py-5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(visible.map((r) => r.id)))}
                aria-label="Select all"
                className="h-5 w-5 cursor-pointer accent-indigo-600"
              />
            </div>
            <div className="px-4 py-5">Comment</div>
            <div className="border-l border-gray-200 px-4 py-5">User</div>
            <div className="border-l border-gray-200 px-4 py-5">Course</div>
            <div className="border-l border-gray-200 px-4 py-5">Chapter</div>
            <div className="sticky right-0 border-l border-gray-200 bg-gray-50 px-4 py-5">Actions</div>
          </div>

          {visible.map((r) => (
            <div key={r.id} className={`grid ${COLS} items-center border-b border-gray-200 text-lg text-black last:border-b-0`}>
              <div className="flex items-center justify-center py-5">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(r.id)) next.delete(r.id);
                      else next.add(r.id);
                      return next;
                    })
                  }
                  aria-label="Select comment"
                  className="h-5 w-5 cursor-pointer accent-indigo-600"
                />
              </div>
              <div className="flex min-w-0 items-center gap-3 px-4 py-5">
                {!r.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-black" aria-label="Unread" />}
                <span className="truncate">{r.content}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2 px-4 py-4">
                <Avatar src={r.userAvatar} size={30} />
                <span className="truncate">{r.userName}</span>
              </div>
              <div className="truncate px-4 py-5">{r.courseTitle}</div>
              <div className="truncate px-4 py-5">{r.chapterTitle || "-"}</div>
              <div className="sticky right-0 bg-white px-4 py-5">
                <button onClick={() => setOpen(r)} className="cursor-pointer text-lg text-[#1d86ff] hover:underline">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>

        {failed ? (
          <p className="py-16 text-center text-base text-gray-600">Could not load the comments. Please refresh and try again.</p>
        ) : !rows ? (
          <div className="flex justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <MdOutlineInbox className="h-14 w-14" />
            <p className="mt-2 text-lg">No Data</p>
          </div>
        ) : null}
      </div>

      {open && (
        <ThreadPanel
          key={open.id}
          courseId={open.courseId}
          commentId={open.id}
          onClose={() => setOpen(null)}
          onReadChange={(id, read) => setReadLocal([id], read)}
          onReplied={() => {}}
        />
      )}
    </div>
  );
}
