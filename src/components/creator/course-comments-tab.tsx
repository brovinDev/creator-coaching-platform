"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Search, User, X } from "lucide-react";
import { MdChevronRight, MdSend } from "react-icons/md";
import toast from "react-hot-toast";
import { DateBox } from "@/components/creator/course-drip-tab";

interface CommentRow {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  lessonId: string;
  chapterTitle: string;
  createdAt: string | null;
  isRead: boolean;
  replies: number;
}

interface ThreadEntry {
  id: string;
  content: string;
  userName: string;
  userAvatar: string | null;
  isCreator: boolean;
  createdAt: string | null;
}

interface Thread {
  courseTitle: string;
  chapterTitle: string;
  isRead: boolean;
  comment: ThreadEntry;
  replies: ThreadEntry[];
}

type Filter = "all" | "unread" | "read";

const pad = (n: number) => String(n).padStart(2, "0");
const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const fmtDate = (iso: string | null) => {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return "-";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

function timeAgo(iso: string | null) {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return "";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, "year"],
    [60 * 60 * 24 * 30, "month"],
    [60 * 60 * 24 * 7, "week"],
    [60 * 60 * 24, "day"],
    [60 * 60, "hour"],
    [60, "minute"],
  ];
  for (const [size, label] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${label}${n === 1 ? "" : "s"} ago`;
  }
  return "just now";
}

export function Avatar({ src, size = 30 }: { src: string | null; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-gray-300" style={{ width: size, height: size }}>
      <User className="text-white" style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}

export function ThreadPanel({
  courseId,
  commentId,
  placeholder = "Write a comment...",
  onClose,
  onReadChange,
  onReplied,
}: {
  courseId: string;
  placeholder?: string;
  commentId: string;
  onClose: () => void;
  onReadChange: (id: string, read: boolean) => void;
  onReplied: (id: string, replies: number) => void;
}) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    const res = await fetch(`/api/courses/${courseId}/comments/${commentId}`);
    if (!res.ok) throw new Error();
    return (await res.json()) as Thread;
  }

  async function setRead(read: boolean) {
    const res = await fetch(`/api/courses/${courseId}/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [commentId], read }),
    });
    if (!res.ok) return toast.error("Could not update the comment");
    setThread((t) => (t ? { ...t, isRead: read } : t));
    onReadChange(commentId, read);
  }

  // Opening a thread counts as reading it.
  useEffect(() => {
    let cancelled = false;
    load()
      .then(async (t) => {
        if (cancelled) return;
        setThread(t);
        if (!t.isRead) {
          const res = await fetch(`/api/courses/${courseId}/comments`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [commentId], read: true }),
          });
          if (res.ok && !cancelled) {
            setThread({ ...t, isRead: true });
            onReadChange(commentId, true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentId]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: commentId, content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Could not send");
      }
      setDraft("");
      const fresh = await load();
      setThread(fresh);
      onReplied(commentId, fresh.replies.length);
      onReadChange(commentId, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  const entry = (e: ThreadEntry) => (
    <div key={e.id} className="rounded-lg bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar src={e.userAvatar} size={50} />
        <div>
          <p className="flex items-center gap-2 text-[22px] font-semibold leading-7 text-black">
            {e.userName}
            {e.isCreator && (
              <span className="rounded bg-[#333] px-1.5 py-0.5 text-[11px] font-bold uppercase leading-4 tracking-wide text-white">Creator</span>
            )}
          </p>
          <p className="text-base text-gray-500">{timeAgo(e.createdAt)}</p>
        </div>
      </div>
      <p className="mt-4 whitespace-pre-wrap break-words text-lg leading-7 text-black">{e.content}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-full w-full max-w-[748px] flex-col bg-gray-50 shadow-2xl">
        <div className="flex h-[90px] shrink-0 items-center gap-4 bg-white px-6">
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
            <X className="h-5 w-5 text-black" />
          </button>
          <p className="flex min-w-0 items-center gap-2 text-2xl font-semibold text-black">
            <span className="truncate">{thread?.courseTitle ?? ""}</span>
            {thread && <MdChevronRight className="h-6 w-6 shrink-0" />}
            <span className="truncate">{thread?.chapterTitle ?? ""}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3">
          {failed ? (
            <p className="py-16 text-center text-base text-gray-600">Could not load this comment.</p>
          ) : !thread ? (
            <div className="flex justify-center py-16">
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
            </div>
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <button
                  onClick={() => setRead(!thread.isRead)}
                  className="flex h-[42px] cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-4 text-lg text-black hover:bg-gray-50"
                >
                  <MessageSquare className="h-4 w-4" /> {thread.isRead ? "Mark as unread" : "Mark as read"}
                </button>
              </div>
              {entry(thread.comment)}
              <div className="my-3 flex items-center gap-3 text-lg text-gray-700">
                <span>
                  {thread.replies.length === 0 ? "No replies" : `${thread.replies.length} ${thread.replies.length === 1 ? "reply" : "replies"}`}
                </span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="space-y-3">{thread.replies.map(entry)}</div>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 bg-white px-4 py-3">
          <Avatar src={null} size={50} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={2000}
            placeholder={placeholder}
            className="h-[50px] flex-1 rounded-full bg-gray-100 px-5 text-lg text-black placeholder:text-gray-500 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            aria-label="Send"
            className="cursor-pointer p-1 text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            <MdSend className="h-8 w-8" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CourseCommentsTab({ courseId }: { courseId: string }) {
  const [rows, setRows] = useState<CommentRow[] | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/courses/${courseId}/comments`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { courseTitle: string; comments: CommentRow[] }) => {
        if (cancelled) return;
        setRows(data.comments);
        setCourseTitle(data.courseTitle);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((c) => {
      if (filter === "unread" && c.isRead) return false;
      if (filter === "read" && !c.isRead) return false;
      if (q && !c.userName.toLowerCase().includes(q)) return false;
      if (c.createdAt) {
        const day = localDay(c.createdAt);
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      return true;
    });
  }, [rows, query, filter, from, to]);

  const allSelected = visible.length > 0 && visible.every((c) => selected.has(c.id));

  function setReadLocal(ids: string[], read: boolean) {
    const set = new Set(ids);
    setRows((list) => (list ?? []).map((c) => (set.has(c.id) ? { ...c, isRead: read } : c)));
  }

  async function markSelected(read: boolean) {
    const ids = [...selected];
    if (ids.length === 0) return;
    const res = await fetch(`/api/courses/${courseId}/comments`, {
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
    { key: "unread", label: "Unread" },
    { key: "read", label: "Read" },
  ];
  const COLS = "grid-cols-[60px_minmax(280px,1.5fr)_minmax(220px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_130px_100px]";
  const noneSelected = selected.size === 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-[27px] font-semibold text-black">Comments</h2>
      <p className="mt-1 text-[17px] text-gray-700">List of all the comments on your course</p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-800" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by User details"
            className="h-[50px] w-full rounded-md border border-gray-200 pl-12 pr-4 text-lg text-black placeholder:text-gray-600 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div className="flex h-[50px] items-center rounded-md border border-gray-200 px-1">
          <DateBox value={from} onChange={setFrom} allowPast bare placeholder="Start date" />
          <span className="text-gray-500">&rarr;</span>
          <DateBox value={to} onChange={setTo} allowPast bare placeholder="End date" />
          {(from || to) && (
            <button
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              aria-label="Clear dates"
              className="mr-2 cursor-pointer text-gray-500 hover:text-black"
            >
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
                filter === f.key ? "border-2 border-indigo-600 font-medium" : "border-gray-300 hover:bg-gray-50"
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
              className="flex h-[42px] cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-5 text-lg text-black hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white"
            >
              <MessageSquare className="h-4 w-4" /> {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
        <div className="min-w-[1130px]">
          <div className={`grid ${COLS} items-center border-b border-gray-200 text-lg text-black`}>
            <div className="flex items-center justify-center py-5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(visible.map((c) => c.id)))}
                aria-label="Select all"
                className="h-5 w-5 cursor-pointer accent-indigo-600"
              />
            </div>
            <div className="px-4 py-5">Comment</div>
            <div className="border-l border-gray-200 px-4 py-5">User</div>
            <div className="border-l border-gray-200 px-4 py-5">Course</div>
            <div className="border-l border-gray-200 px-4 py-5">Chapter</div>
            <div className="border-l border-gray-200 px-4 py-5">Created at</div>
            <div className="sticky right-0 border-l border-gray-200 bg-white px-4 py-5">Actions</div>
          </div>

          {visible.map((c) => (
            <div key={c.id} className={`grid ${COLS} items-center border-b border-gray-200 text-lg text-black last:border-b-0`}>
              <div className="flex items-center justify-center py-5">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(c.id)) next.delete(c.id);
                      else next.add(c.id);
                      return next;
                    })
                  }
                  aria-label="Select comment"
                  className="h-5 w-5 cursor-pointer accent-indigo-600"
                />
              </div>
              <div className={`truncate px-4 py-5 ${c.isRead ? "" : "font-semibold"}`}>{c.content}</div>
              <div className="flex min-w-0 items-center gap-2 px-4 py-4">
                <Avatar src={c.userAvatar} size={30} />
                <span className="truncate">{c.userName}</span>
              </div>
              <div className="truncate px-4 py-5">{courseTitle}</div>
              <div className="truncate px-4 py-5">{c.chapterTitle || "-"}</div>
              <div className="px-4 py-5">{fmtDate(c.createdAt)}</div>
              <div className="sticky right-0 bg-white px-4 py-5">
                <button onClick={() => setOpen(c.id)} className="cursor-pointer text-lg text-indigo-600 hover:underline">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>

        {failed ? (
          <p className="py-14 text-center text-base text-gray-600">Could not load the comments. Please refresh and try again.</p>
        ) : !rows ? (
          <div className="flex justify-center py-14">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-14 text-center text-lg text-gray-600">
            {rows.length === 0 ? "No comments yet. Comments learners leave on your chapters will appear here." : "No comments match your filters."}
          </p>
        ) : null}
      </div>

      {open && (
        <ThreadPanel
          key={open}
          courseId={courseId}
          commentId={open}
          onClose={() => setOpen(null)}
          onReadChange={(id, read) => setReadLocal([id], read)}
          onReplied={(id, replies) => setRows((list) => (list ?? []).map((c) => (c.id === id ? { ...c, replies } : c)))}
        />
      )}
    </div>
  );
}
