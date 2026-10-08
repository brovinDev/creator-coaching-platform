"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Clock, Heart, Loader2, MessageCircle, PenSquare, Plus, Trash2, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CreatePostModal } from "./create-post-modal";
import { type SessionItem } from "@/components/workshops/workshop-list";

interface Post {
  id: string;
  content: string;
  imageUrl: string;
  scheduled: boolean;
  createdAt: string;
  author: { name: string; logo: string };
  likeCount: number;
  liked: boolean;
  commentCount: number;
  includeServices?: string[];
  excludeServices?: string[];
}

interface Comment {
  id: string;
  userName: string;
  content: string;
  createdAt: string;
  /** Empty for a top-level comment; otherwise the comment this is a reply under. */
  parentId: string;
}

function timeAgo(value: string) {
  const time = Date.parse(value);
  if (!time) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return "just now";
  const units: [string, number][] = [
    ["w", 604800],
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
  ];
  for (const [label, size] of units) if (seconds >= size) return `${Math.floor(seconds / size)}${label}`;
  return "";
}

function Avatar({ name, image, size = "h-12 w-12" }: { name: string; image?: string | null; size?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className={cn("rounded-full object-cover", size)} />;
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600", size)}>
      {name.charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function Comments({ post, onCount }: { post: Post; onCount: (n: number) => void }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // The comment being answered; null writes a new top-level comment.
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/feed/${post.id}/comments`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setComments)
      .catch(() => {
        setComments([]);
        toast.error("Could not load comments");
      });
  }, [post.id]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/feed/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, ...(replyingTo ? { parentId: replyingTo.id } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not comment");
      const next = [...(comments || []), data as Comment];
      setComments(next);
      onCount(next.length);
      setText("");
      setReplyingTo(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not comment");
    } finally {
      setSending(false);
    }
  }

  function startReply(comment: Comment) {
    setReplyingTo(comment);
    input.current?.focus();
  }

  const topLevel = (comments || []).filter((c) => !c.parentId);
  const repliesOf = (id: string) => (comments || []).filter((c) => c.parentId === id);

  const row = (c: Comment, small = false) => (
    <div key={c.id} className="flex gap-2">
      <Avatar name={c.userName} size={small ? "h-7 w-7 text-xs" : "h-8 w-8 text-xs"} />
      <div className="min-w-0">
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <p className="text-xs font-semibold text-gray-900">
            {c.userName} <span className="font-normal text-gray-400">{timeAgo(c.createdAt)}</span>
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{c.content}</p>
        </div>
        <button type="button" onClick={() => startReply(c)} className="ml-3 mt-0.5 cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-800">
          Reply
        </button>
      </div>
    </div>
  );

  return (
    <div className="border-t border-gray-100 px-4 py-3 sm:px-5">
      {comments === null ? (
        <Loader2 className="mx-auto h-4 w-4 animate-spin text-gray-400" />
      ) : (
        <div className="space-y-3">
          {topLevel.map((c) => (
            <div key={c.id} className="space-y-2">
              {row(c)}
              {repliesOf(c.id).length > 0 && <div className="ml-10 space-y-2">{repliesOf(c.id).map((r) => row(r, true))}</div>}
            </div>
          ))}
        </div>
      )}
      {replyingTo && (
        <p className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
          <span className="truncate">Replying to {replyingTo.userName}</span>
          <button type="button" onClick={() => setReplyingTo(null)} className="ml-2 cursor-pointer font-medium text-gray-500 hover:text-gray-800">
            Cancel
          </button>
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <input
          ref={input}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Write a comment..."}
          className="min-w-0 flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || sending}
          className="cursor-pointer rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Post
        </button>
      </div>
    </div>
  );
}

function PostCard({
  post,
  isCreator,
  onChange,
  onDelete,
}: {
  post: Post;
  isCreator: boolean;
  onChange: (p: Post) => void;
  onDelete: (id: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);

  async function toggleLike() {
    const before = post;
    onChange({ ...post, liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) });
    try {
      const res = await fetch(`/api/feed/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onChange({ ...post, liked: data.liked, likeCount: data.likeCount });
    } catch {
      onChange(before);
      toast.error("Could not update your like");
    }
  }

  const audience = [
    post.includeServices?.length ? `Visible to: ${post.includeServices.join(", ")}` : isCreator ? "Visible to all learners" : "",
    post.excludeServices?.length ? `Hidden from: ${post.excludeServices.join(", ")}` : "",
  ].filter(Boolean);

  return (
    <Card>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Avatar name={post.author.name} image={post.author.logo} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900">{post.author.name}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
              {post.scheduled ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  <Clock className="h-3 w-3" /> Scheduled for {new Date(post.createdAt).toLocaleString()}
                </span>
              ) : (
                timeAgo(post.createdAt)
              )}
            </p>
            {isCreator && audience.length > 0 && <p className="mt-0.5 text-xs text-gray-400">{audience.join(" · ")}</p>}
          </div>
          {isCreator && (
            <button
              type="button"
              aria-label="Delete post"
              onClick={() => onDelete(post.id)}
              className="cursor-pointer rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {post.content && <p className="mt-3 whitespace-pre-wrap break-words text-[15px] text-gray-800">{post.content}</p>}
        {post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt="" className="mt-3 max-h-[480px] w-full rounded-lg object-cover" />
        )}

        {!post.scheduled && (
          <div className="mt-4 flex items-center gap-5 text-sm text-gray-600">
            <button
              type="button"
              onClick={toggleLike}
              aria-pressed={post.liked}
              className="flex cursor-pointer items-center gap-1.5 font-medium hover:text-gray-900"
            >
              <Heart className={cn("h-5 w-5", post.liked && "fill-red-500 text-red-500")} />
              {post.likeCount}
            </button>
            <button
              type="button"
              onClick={() => setShowComments((v) => !v)}
              aria-expanded={showComments}
              className="flex cursor-pointer items-center gap-1.5 font-medium hover:text-gray-900"
            >
              <MessageCircle className="h-5 w-5" />
              {post.commentCount}
            </button>
          </div>
        )}
      </div>
      {showComments && !post.scheduled && (
        <Comments post={post} onCount={(n) => onChange({ ...post, commentCount: n })} />
      )}
    </Card>
  );
}

/** The left-panel Create button: pick what to create. */
function CreateMenu({ onPost }: { onPost: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative mt-5" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" /> Create
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-10 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPost();
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
          >
            <PenSquare className="h-7 w-7 shrink-0 text-indigo-500" />
            <span>
              <span className="block text-sm font-semibold text-gray-900">Post</span>
              <span className="block text-xs text-gray-500">Put up content on your services</span>
            </span>
          </button>
          <Link
            href="/creator/workshops?new=1"
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
          >
            <Video className="h-7 w-7 shrink-0 text-blue-500" />
            <span>
              <span className="block text-sm font-semibold text-gray-900">Workshop</span>
              <span className="block text-xs text-gray-500">Setup workshops for your audience</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

const JOIN_LEAD_MS = 15 * 60 * 1000;

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const part = (n: number) => String(n).padStart(2, "0");
  return `${part(Math.floor(total / 3600))}h ${part(Math.floor((total % 3600) / 60))}m ${part(total % 60)}s`;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function TodayCard({ session, now, isCreator }: { session: SessionItem; now: number; isCreator: boolean }) {
  const start = Date.parse(session.startAt);
  const end = Date.parse(session.endAt);
  const live = now >= start;
  const label = isCreator ? "Join as host" : "Join";
  return (
    <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex w-7 shrink-0 items-center justify-center bg-indigo-600">
        <span className="-rotate-90 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-white">Today</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 p-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {session.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300">
              <Video className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <p className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
            {clock(session.startAt)} - {clock(session.endAt)}
            {live && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Live</span>}
          </p>
          <p className="truncate text-base font-bold text-gray-900">{session.title}</p>
          <p className="truncate text-xs text-gray-500">By {session.hostName}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="text-xs font-semibold">
            {live ? (
              <span className="text-red-600">Ends in: {countdown(end - now)}</span>
            ) : (
              <span className="text-gray-600">Starts in: {countdown(start - now)}</span>
            )}
          </p>
          {session.joinUrl ? (
            <a
              href={session.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Video className="h-4 w-4" /> {label}
            </a>
          ) : (
            <span
              title="Opens 15 minutes before the start"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-400"
            >
              <Video className="h-4 w-4" /> {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function UpcomingWorkshops({ isCreator }: { isCreator: boolean }) {
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [now, setNow] = useState(0);
  const refetched = useRef(new Set<string>());

  const load = useCallback(() => {
    fetch("/api/workshops?tab=upcoming&limit=12")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // One shared clock for the countdowns.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // A learner's join link only exists once the window opens, so fetch again when that happens.
  useEffect(() => {
    if (!sessions || !now) return;
    const due = sessions.find(
      (s) => !s.joinUrl && now >= Date.parse(s.startAt) - JOIN_LEAD_MS && now < Date.parse(s.endAt) && !refetched.current.has(s.key)
    );
    if (due) {
      refetched.current.add(due.key);
      load();
    }
  }, [now, sessions, load]);

  const today = new Date(now || 0);
  const open = (sessions || []).filter((s) => !now || Date.parse(s.endAt) > now);
  const todays = open.filter((s) => now && sameDay(new Date(s.startAt), today));
  const later = open.filter((s) => !todays.includes(s)).slice(0, 6);

  return (
    <div className="space-y-3">
      {todays.map((s) => (
        <TodayCard key={s.key} session={s} now={now} isCreator={isCreator} />
      ))}

      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming workshops</h2>
            <Link href={`${isCreator ? "/creator" : "/student"}/workshops`} className="text-sm font-medium text-indigo-600 hover:underline">
              See all
            </Link>
          </div>
          {sessions === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : later.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Clock className="mb-3 h-10 w-10 text-gray-300" />
              <p className="max-w-sm text-sm text-gray-500">
                {todays.length > 0
                  ? "Nothing else is scheduled after today's sessions."
                  : "Your scheduled sessions will appear here. Add them to your calendar and join when the button appears."}
              </p>
            </div>
          ) : (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {later.map((s) => {
                const date = new Date(s.startAt);
                return (
                  <div key={s.key} className="flex w-72 shrink-0 items-start gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="w-12 shrink-0 overflow-hidden rounded-md border border-gray-200 text-center">
                      <p className="bg-indigo-600 py-0.5 text-[10px] font-bold uppercase text-white">
                        {date.toLocaleDateString([], { month: "short" })}
                      </p>
                      <p className="text-xl font-bold leading-tight text-gray-900">{date.getDate()}</p>
                      <p className="pb-0.5 text-[10px] text-gray-500">{date.toLocaleDateString([], { weekday: "short" })}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-indigo-700">
                        {date.toLocaleDateString([], { day: "numeric", month: "long" })} · {clock(s.startAt)} - {clock(s.endAt)}
                      </p>
                      <p className="truncate text-sm font-semibold text-gray-900">{s.title}</p>
                      <p className="truncate text-xs text-gray-500">By {s.hostName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export function FeedView({
  isCreator,
  userName,
  userImage,
}: {
  isCreator: boolean;
  userName: string;
  userImage?: string | null;
}) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetch("/api/feed")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: Post[]) => {
        setPosts(list);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!window.confirm("Delete this post? Likes and comments on it will be removed too.")) return;
    try {
      const res = await fetch(`/api/feed/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPosts((list) => (list || []).filter((p) => p.id !== id));
      toast.success("Post deleted");
    } catch {
      toast.error("Could not delete the post");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,640px)_1fr]">
      <aside className="hidden lg:block">
        <div className="flex items-center gap-3">
          <Avatar name={userName} image={userImage} size="h-14 w-14 text-lg" />
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-900">{userName}</p>
        </div>
        {isCreator && <CreateMenu onPost={() => setCreating(true)} />}
      </aside>

      <div className="min-w-0 space-y-4">
        {isCreator && (
          <Card>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full cursor-pointer items-center gap-3 p-4 text-left"
            >
              <Avatar name={userName} image={userImage} size="h-11 w-11" />
              <span className="flex-1 text-gray-400">Share what&apos;s on your mind...</span>
              <Plus className="h-6 w-6 text-gray-500" />
            </button>
          </Card>
        )}

        <UpcomingWorkshops isCreator={isCreator} />

        <h2 className="pt-2 text-xl font-bold text-gray-900">Feed</h2>

        {posts === null && !failed && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        {failed && (
          <Card>
            <div className="p-8 text-center text-sm text-gray-500">
              Could not load the feed.{" "}
              <button type="button" onClick={load} className="cursor-pointer font-semibold text-indigo-600 hover:underline">
                Try again
              </button>
            </div>
          </Card>
        )}
        {posts && posts.length === 0 && (
          <Card>
            <div className="p-10 text-center">
              <p className="font-medium text-gray-900">No posts yet</p>
              <p className="mt-1 text-sm text-gray-500">
                {isCreator
                  ? "Share an update with your learners to get the conversation started."
                  : "Updates from your creators will show up here."}
              </p>
            </div>
          </Card>
        )}
        {posts?.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isCreator={isCreator}
            onChange={(next) => setPosts((list) => (list || []).map((p) => (p.id === next.id ? next : p)))}
            onDelete={remove}
          />
        ))}
      </div>

      {isCreator && (
        <CreatePostModal
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={load}
          userName={userName}
          userImage={userImage}
        />
      )}
    </div>
  );
}
