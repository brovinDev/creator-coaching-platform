"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, User } from "lucide-react";
import { MdSend } from "react-icons/md";
import toast from "react-hot-toast";

interface Entry {
  id: string;
  content: string;
  userName: string;
  userAvatar: string | null;
  createdAt: string | null;
  mine: boolean;
  isCreator: boolean;
}

interface Item extends Entry {
  replies: Entry[];
}

interface Payload {
  me: { name: string; avatar: string | null };
  canModerate: boolean;
  items: Item[];
}

/** "7s", "5m", "2h", "3d", "2w", "4mo", "1y" */
function shortAgo(iso: string | null) {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return "";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, "y"],
    [60 * 60 * 24 * 30, "mo"],
    [60 * 60 * 24 * 7, "w"],
    [60 * 60 * 24, "d"],
    [60 * 60, "h"],
    [60, "m"],
  ];
  for (const [size, label] of units) {
    const n = Math.floor(s / size);
    if (n >= 1) return `${n}${label}`;
  }
  return "";
}

function Avatar({ src, size }: { src: string | null; size: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-gray-400" style={{ width: size, height: size }}>
      <User className="text-white" style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}

function Composer({
  avatar,
  placeholder,
  onSend,
  autoFocus,
}: {
  avatar: string | null;
  placeholder: string;
  onSend: (text: string) => Promise<boolean>;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    if (await onSend(content)) setDraft("");
    setSending(false);
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar src={avatar} size={40} />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        autoFocus={autoFocus}
        maxLength={2000}
        placeholder={placeholder}
        className="h-12 flex-1 rounded-full bg-gray-200 px-5 text-base text-black placeholder:text-gray-600 focus:outline-none"
      />
      <button
        onClick={send}
        disabled={!draft.trim() || sending}
        aria-label="Send"
        className="cursor-pointer text-gray-800 hover:text-black disabled:cursor-not-allowed disabled:text-gray-400"
      >
        <MdSend className="h-8 w-8" />
      </button>
    </div>
  );
}

/**
 * Comments (or questions) under a chapter, as on TagMango's course page: write one, reply to one,
 * and remove your own. Remount with a new `lessonId` to switch chapters.
 */
export function LessonDiscussion({
  courseId,
  lessonId,
  kind = "comment",
}: {
  courseId: string;
  lessonId: string;
  kind?: "comment" | "question";
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const label = kind === "question" ? "question" : "comment";

  async function load() {
    const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/comments?kind=${kind}`);
    if (!res.ok) throw new Error();
    setData((await res.json()) as Payload);
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/courses/${courseId}/lessons/${lessonId}/comments?kind=${kind}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Payload) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId, kind]);

  async function post(content: string, parentId?: string) {
    const res = await fetch(`/api/courses/${courseId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, parentId, kind, content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || `Could not post your ${label}`);
      return false;
    }
    await load().catch(() => {});
    return true;
  }

  async function remove(id: string) {
    setMenuFor(null);
    if (!confirm(`Delete this ${label}?`)) return;
    const res = await fetch(`/api/courses/${courseId}/comments/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error(`Could not delete the ${label}`);
    await load().catch(() => {});
  }

  const card = (e: Entry, isReply: boolean) => (
    <div className="relative rounded-xl bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <Avatar src={e.userAvatar} size={isReply ? 34 : 40} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-black">
            {e.userName}
            {e.isCreator && (
              <span className="rounded bg-[#333] px-1.5 py-0.5 text-[10px] font-bold uppercase leading-4 tracking-wide text-white">Creator</span>
            )}
            <span className="text-gray-400">&bull;</span>
            <span className="text-sm font-normal text-gray-600">{shortAgo(e.createdAt)}</span>
          </p>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-base text-black">{e.content}</p>
        </div>
        {(e.mine || data?.canModerate) && (
          <div className="relative">
            <button
              onClick={() => setMenuFor(menuFor === e.id ? null : e.id)}
              aria-label="More"
              className="cursor-pointer rounded p-1 text-gray-700 hover:bg-gray-100"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuFor === e.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button onClick={() => remove(e.id)} className="w-full cursor-pointer px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section>
      <h3 className="text-xl font-semibold text-black">{kind === "question" ? "Questions" : "Comments"}</h3>

      <div className="mt-4">
        <Composer
          avatar={data?.me.avatar ?? null}
          placeholder={kind === "question" ? "Ask a question..." : "Add a comment..."}
          onSend={(content) => post(content)}
        />
      </div>

      <div className="mt-5 space-y-1">
        {failed ? (
          <p className="py-6 text-sm text-gray-500">Could not load the {label}s. Please refresh and try again.</p>
        ) : !data ? (
          <p className="py-6 text-sm text-gray-400">Loading...</p>
        ) : data.items.length === 0 ? (
          <p className="py-6 text-sm text-gray-500">
            {kind === "question" ? "No questions yet. Ask the first one." : "No comments yet. Be the first to comment."}
          </p>
        ) : (
          data.items.map((c) => (
            <div key={c.id} className="pb-3">
              {card(c, false)}
              <p className="mt-1.5 px-1 text-sm text-gray-600">
                <button
                  onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                  className="cursor-pointer font-semibold hover:text-black"
                >
                  Reply
                </button>
                <span className="mx-1.5">&bull;</span>
                {shortAgo(c.createdAt)}
              </p>

              {(c.replies.length > 0 || replyingTo === c.id) && (
                <div className="ml-10 mt-2 space-y-2">
                  {c.replies.map((r) => (
                    <div key={r.id}>{card(r, true)}</div>
                  ))}
                  {replyingTo === c.id && (
                    <Composer
                      avatar={data.me.avatar}
                      placeholder="Write a reply..."
                      autoFocus
                      onSend={async (content) => {
                        const ok = await post(content, c.id);
                        if (ok) setReplyingTo(null);
                        return ok;
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
