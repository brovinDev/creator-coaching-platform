"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BellOff,
  ChevronDown,
  Copy,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  Search,
  Send,
  Smile,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setOpenRoom } from "@/lib/open-room";

interface Room {
  id: string;
  serviceId: string;
  name: string;
  unread: number;
  muted: boolean;
  last: { userName: string; content: string; createdAt: string } | null;
}

interface Message {
  id: string;
  userName: string;
  role: "CREATOR" | "STUDENT";
  content: string;
  createdAt: string;
  mine: boolean;
  parentId: string | null;
  reactions: Reaction[];
}

interface RoomsResponse {
  rooms: Room[];
  availableServices: { id: string; title: string }[];
}

const MESSAGE_POLL_MS = 4000;
const ROOM_POLL_MS = 20000;

function when(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function RoomAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-base font-semibold text-indigo-700">
      {name.charAt(0).toUpperCase() || "?"}
    </span>
  );
}

// Loaded only when someone opens it: the emoji data is large.
const Picker = dynamic(() => import("emoji-picker-react"), { ssr: false });

// The quick reactions, as unicode codes.
const QUICK_REACTIONS = ["1f44d", "2764-fe0f", "1f602", "1f389", "1f64f", "1f44f"];
const PICKER_HEIGHT = 440;

interface Reaction {
  emoji: string;
  count: number;
  mine: boolean;
}

function dayLabel(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

function ago(value: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (isNaN(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : `${Math.round(days / 7)}w ago`;
}

const clock = (value: string) => {
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

/** Message text with web addresses turned into links. */
function Linked({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function PersonAvatar({ name, role, small }: { name: string; role: "CREATOR" | "STUDENT"; small?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        small ? "h-5 w-5 text-[10px]" : "h-9 w-9 text-sm",
        role === "CREATOR" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"
      )}
    >
      {name.charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function ReactionBar({ reactions, onReact }: { reactions: Reaction[]; onReact: (emoji: string) => void }) {
  if (reactions.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onReact(r.emoji)}
          className={cn(
            "flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
            r.mine ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          )}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * The emoji picker, floating next to the button that opened it. For a reaction it starts as the
 * quick bar (👍 ❤️ 😂 🎉 🙏 👏) that expands to everything; in the message box it is the full picker.
 */
function EmojiPopover({
  anchor,
  quick,
  onPick,
  onClose,
}: {
  anchor: DOMRect;
  quick?: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const width = 340;
  const left = Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8));
  // On whichever side of the button has more room (the top bar is 65px), as tall as fits there.
  const roomBelow = window.innerHeight - anchor.bottom - 16;
  const roomAbove = anchor.top - 65 - 16;
  const below = roomBelow >= PICKER_HEIGHT || roomBelow >= roomAbove;
  const height = Math.max(260, Math.min(PICKER_HEIGHT, below ? roomBelow : roomAbove));
  const place = below ? { top: anchor.bottom + 6 } : { bottom: window.innerHeight - anchor.top + 6 };

  return (
    <div ref={box} className="fixed z-50" style={{ left, ...place }}>
      <Picker
        width={width}
        height={height}
        emojiStyle={"google" as never}
        previewConfig={{ showPreview: false }}
        lazyLoadEmojis
        reactionsDefaultOpen={quick}
        allowExpandReactions
        reactions={QUICK_REACTIONS}
        onEmojiClick={(d) => onPick(d.emoji)}
        onReactionClick={(d) => onPick(d.emoji)}
      />
    </div>
  );
}

function MessageRow({
  m,
  replies,
  canDelete,
  inThread,
  onReact,
  onReply,
  onDelete,
}: {
  m: Message;
  replies: Message[];
  canDelete: boolean;
  inThread?: boolean;
  onReact: (id: string, emoji: string) => void;
  onReply?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [picker, setPicker] = useState<DOMRect | null>(null);
  const [menu, setMenu] = useState(false);
  const last = replies[replies.length - 1];

  return (
    <div
      className="group relative flex gap-3 px-5 py-2 hover:bg-gray-100/70"
      onMouseLeave={() => setMenu(false)}
    >
      <PersonAvatar name={m.userName} role={m.role} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm font-semibold text-gray-900">{m.userName}</span>
          {m.role === "CREATOR" && (
            <span className="whitespace-nowrap rounded border border-gray-300 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-gray-600">Creator</span>
          )}
          <span className="whitespace-nowrap text-xs text-gray-400">{clock(m.createdAt)}</span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-800">
          <Linked text={m.content} />
        </p>
        <ReactionBar reactions={m.reactions} onReact={(e) => onReact(m.id, e)} />
        {!inThread && last && onReply && (
          <button type="button" onClick={() => onReply(m.id)} className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs hover:underline">
            <PersonAvatar name={last.userName} role={last.role} small />
            <span className="font-semibold text-indigo-600">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
            <span className="text-gray-500">Last reply {ago(last.createdAt)}</span>
          </button>
        )}
      </div>

      <div className="absolute -top-4 right-5 hidden items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm group-hover:flex">
        <button type="button" onClick={(e) => setPicker(picker ? null : e.currentTarget.getBoundingClientRect())} aria-label="Add reaction" className="cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
          <SmilePlus className="h-4 w-4" />
        </button>
        {!inThread && onReply && (
          <button type="button" onClick={() => onReply(m.id)} aria-label="Reply in thread" className="cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
            <MessageSquare className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => setMenu((v) => !v)} aria-label="More" className="cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {picker && (
        <EmojiPopover
          anchor={picker}
          quick
          onPick={(e) => {
            onReact(m.id, e);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {menu && (
        <div className="absolute right-5 top-3 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-md">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(m.content).then(() => toast.success("Copied"));
              setMenu(false);
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Copy className="h-4 w-4" /> Copy text
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                onDelete(m.id);
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The box people type into, for the room and for a thread. */
function Composer({ placeholder, sending, onSend }: { placeholder: string; sending: boolean; onSend: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState<DOMRect | null>(null);

  async function submit() {
    const value = text.trim();
    if (!value || sending) return;
    if (await onSend(value)) setText("");
  }

  return (
    <div className="relative border-t border-gray-100 p-3">
      {emoji && (
        <EmojiPopover
          anchor={emoji}
          onPick={(e) => setText((t) => t + e)}
          onClose={() => setEmoji(null)}
        />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 rounded-full bg-gray-100 pl-4 pr-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-gray-500"
        />
        <button type="button" onClick={(e) => setEmoji(emoji ? null : e.currentTarget.getBoundingClientRect())} aria-label="Emoji" className="cursor-pointer rounded-full p-1.5 text-gray-500 hover:bg-gray-200">
          <Smile className="h-5 w-5" />
        </button>
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Send"
          className="cursor-pointer rounded-full p-1.5 text-indigo-600 hover:bg-gray-200 disabled:cursor-default disabled:text-gray-300 disabled:hover:bg-transparent"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

interface Member {
  id: string;
  name: string;
  image: string | null;
  role: "CREATOR" | "STUDENT";
  you: boolean;
}

/** The right-hand "Chat info" panel: the room's details and mute switch, and who is in it. */
function ChatInfo({ room, onClose, onMuted }: { room: Room; onClose: () => void; onMuted: (muted: boolean) => void }) {
  const [tab, setTab] = useState<"info" | "members">("info");
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    if (tab !== "members" || members) return;
    fetch(`/api/messages/rooms/${room.id}/members`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { members: Member[] }) => setMembers(d.members))
      .catch(() => setMembers([]));
  }, [tab, members, room.id]);

  async function toggleMute() {
    const next = !room.muted;
    onMuted(next);
    const res = await fetch(`/api/messages/rooms/${room.id}/mute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muted: next }),
    }).catch(() => null);
    if (!res?.ok) {
      onMuted(!next);
      toast.error("Could not change the notifications");
    }
  }

  return (
    <div className="flex w-full shrink-0 flex-col border-l border-gray-100 lg:w-[26rem]">
      <div className="flex items-center justify-between px-5 pt-3">
        <h3 className="text-lg font-bold text-gray-900">Chat info</h3>
        <button type="button" onClick={onClose} aria-label="Close chat info" className="cursor-pointer rounded-lg p-1 text-gray-500 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex gap-6 border-b border-gray-100 px-5">
        {(["info", "members"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "cursor-pointer border-b-2 px-1 py-3 text-sm font-medium capitalize",
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-700 hover:text-gray-900"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "info" ? (
          <div className="px-5 py-8">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-28 w-28 items-center justify-center rounded-full bg-indigo-50 text-4xl font-semibold text-indigo-700">
                {room.name.charAt(0).toUpperCase() || "?"}
              </span>
              <p className="mt-4 text-xl font-bold text-gray-900">{room.name}</p>
            </div>
            <div className="mt-10 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-gray-800">
                <BellOff className="h-5 w-5 text-gray-500" /> Mute notifications
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={room.muted}
                aria-label="Mute notifications"
                onClick={toggleMute}
                className={cn("relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors", room.muted ? "bg-indigo-600" : "bg-gray-300")}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", room.muted ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
          </div>
        ) : members === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : members.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">No members to show.</p>
        ) : (
          <ul className="py-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <PersonAvatar name={m.name} role={m.role} />
                )}
                <span className="min-w-0 truncate text-sm font-medium text-gray-900">
                  {m.name}
                  {m.you && <span className="font-normal text-gray-400"> (you)</span>}
                </span>
                {m.role === "CREATOR" && (
                  <span className="whitespace-nowrap rounded border border-gray-300 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-gray-600">Creator</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Conversation({
  room,
  isCreator,
  onBack,
  onRead,
  onMuted,
}: {
  room: Room;
  isCreator: boolean;
  onBack: () => void;
  onRead: () => void;
  onMuted: (muted: boolean) => void;
}) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [sending, setSending] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showDown, setShowDown] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // Tell the badges which room is on screen, so a message arriving in it is not counted as unread.
  useEffect(() => {
    setOpenRoom(room.id);
    return () => setOpenRoom(null);
  }, [room.id]);

  const load = useCallback(() => {
    fetch(`/api/messages/rooms/${room.id}/messages`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: Message[]) => setMessages(rows))
      .catch(() => setMessages((m) => m ?? []));
  }, [room.id]);

  useEffect(() => {
    // The room is keyed by its id, so a different room starts with fresh state.
    stick.current = true;
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, MESSAGE_POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Having the room open means what is in it has been read.
  const newest = messages?.[messages.length - 1]?.id;
  useEffect(() => {
    if (!newest) return;
    fetch(`/api/messages/rooms/${room.id}/read`, { method: "POST" })
      .then(() => onRead())
      .catch(() => {});

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest, room.id]);

  // Follow new messages only while the reader is already at the bottom.
  useEffect(() => {
    if (stick.current) end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(content: string, parentId?: string) {
    setSending(true);
    try {
      const res = await fetch(`/api/messages/rooms/${room.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send");
      if (!parentId) stick.current = true;
      setMessages((m) => [...(m || []), data as Message]);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function react(messageId: string, emoji: string) {
    // Shown at once; the refresh below puts the server's answer in its place.
    setMessages((all) =>
      (all || []).map((m) => {
        if (m.id !== messageId) return m;
        const has = m.reactions.find((r) => r.emoji === emoji);
        const reactions = has
          ? has.mine
            ? m.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r)).filter((r) => r.count > 0)
            : m.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r))
          : [...m.reactions, { emoji, count: 1, mine: true }];
        return { ...m, reactions };
      })
    );
    const res = await fetch(`/api/messages/rooms/${room.id}/messages/${messageId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    }).catch(() => null);
    if (!res?.ok) toast.error("Could not add the reaction");
    load();
  }

  async function remove(messageId: string) {
    if (!window.confirm("Delete this message? Its replies are deleted too.")) return;
    const res = await fetch(`/api/messages/rooms/${room.id}/messages/${messageId}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return void toast.error("Could not delete the message");
    if (threadId === messageId) setThreadId(null);
    load();
  }

  const all = messages ?? [];
  const top = all.filter((m) => !m.parentId);
  const repliesOf = (id: string) => all.filter((m) => m.parentId === id);
  const thread = threadId ? (all.find((m) => m.id === threadId) ?? null) : null;
  const canDelete = (m: Message) => m.mine || isCreator;

  return (
    <div className="flex h-full min-h-0">
      <div className={cn("flex min-w-0 flex-1 flex-col", (thread || infoOpen) && "hidden lg:flex")}>
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
          <button type="button" onClick={onBack} aria-label="Back to rooms" className="cursor-pointer rounded-lg p-1 hover:bg-gray-100 md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setThreadId(null);
              setInfoOpen(true);
            }}
            className="flex min-w-0 cursor-pointer items-center gap-3 text-left"
          >
            <RoomAvatar name={room.name} />
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold leading-tight text-gray-900">{room.name}</span>
              <span className="block truncate text-sm text-gray-500">Click here for more info</span>
            </span>
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              const away = el.scrollHeight - el.scrollTop - el.clientHeight;
              stick.current = away < 80;
              setShowDown(away > 240);
            }}
            className="h-full overflow-y-auto py-4"
          >
            {messages === null ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : top.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">No messages yet. Say hello!</p>
            ) : (
              top.map((m, i) => {
                const newDay = i === 0 || dayLabel(top[i - 1].createdAt) !== dayLabel(m.createdAt);
                return (
                  <div key={m.id}>
                    {newDay && (
                      <div className="my-4 flex justify-center">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-1 text-xs text-gray-600">{dayLabel(m.createdAt)}</span>
                      </div>
                    )}
                    <MessageRow m={m} replies={repliesOf(m.id)} canDelete={canDelete(m)} onReact={react} onReply={(id) => {
                        setInfoOpen(false);
                        setThreadId(id);
                      }} onDelete={remove} />
                  </div>
                );
              })
            )}
            <div ref={end} />
          </div>
          {showDown && (
            <button
              type="button"
              onClick={() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
              aria-label="Scroll to the latest message"
              className="absolute bottom-4 right-6 cursor-pointer rounded-full border border-gray-200 bg-white p-2 shadow-md hover:bg-gray-50"
            >
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>

        <Composer placeholder="Type a message..." sending={sending} onSend={(t) => send(t)} />
      </div>

      {infoOpen && !thread && <ChatInfo room={room} onClose={() => setInfoOpen(false)} onMuted={onMuted} />}

      {thread && (
        <div className="flex w-full shrink-0 flex-col border-l border-gray-100 lg:w-[26rem]">
          <div className="flex items-center justify-between px-5 py-3">
            <h3 className="text-lg font-bold text-gray-900">Replies</h3>
            <button type="button" onClick={() => setThreadId(null)} aria-label="Close replies" className="cursor-pointer rounded-lg p-1 text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="bg-gray-100/70 py-2">
              <MessageRow m={thread} replies={[]} canDelete={canDelete(thread)} inThread onReact={react} onDelete={remove} />
            </div>
            <p className="flex items-center gap-3 px-5 py-3 text-xs text-gray-500">
              {repliesOf(thread.id).length} {repliesOf(thread.id).length === 1 ? "reply" : "replies"}
              <span className="h-px flex-1 bg-gray-200" />
            </p>
            {repliesOf(thread.id).map((r) => (
              <MessageRow key={r.id} m={r} replies={[]} canDelete={canDelete(r)} inThread onReact={react} onDelete={remove} />
            ))}
          </div>
          <Composer placeholder="Reply..." sending={sending} onSend={(t) => send(t, thread.id)} />
        </div>
      )}
    </div>
  );
}

export function MessagesView({ isCreator }: { isCreator: boolean }) {
  const [data, setData] = useState<RoomsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | string>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    fetch("/api/messages/rooms")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: RoomsResponse) => {
        setData(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, ROOM_POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Opening a room clears its count on screen at once; the server is told by the room itself.
  const clearUnread = (roomId: string) =>
    setData((d) => (d ? { ...d, rooms: d.rooms.map((r) => (r.id === roomId ? { ...r, unread: 0 } : r)) } : d));

  const afterRead = (roomId: string) => {
    clearUnread(roomId);
    window.dispatchEvent(new Event("messages-changed"));
    load();
  };

  async function createRoom() {
    if (!serviceId || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/messages/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not create the room");
      setCreating(false);
      setServiceId("");
      setActiveId(String(body.id));
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the room");
    } finally {
      setSaving(false);
    }
  }

  // The room being read never shows a count, even for a message that arrived a moment ago.
  const allRooms = (data?.rooms ?? []).map((r) => (r.id === activeId ? { ...r, unread: 0 } : r));
  const active = allRooms.find((r) => r.id === activeId) || null;
  const totalUnread = allRooms.reduce((n, r) => n + r.unread, 0);
  const q = query.trim().toLowerCase();
  // Filters: All, Unread, or one service (its room).
  const rooms = allRooms.filter(
    (r) =>
      (filter === "all" || (filter === "unread" ? r.unread > 0 : r.serviceId === filter)) &&
      (!q || r.name.toLowerCase().includes(q) || (r.last?.content.toLowerCase().includes(q) ?? false))
  );
  const available = data?.availableServices ?? [];

  return (
    <div className="h-full">
      <div className="flex h-full">
        <div className={cn("w-full shrink-0 flex-col border-r border-gray-200 md:flex md:w-80", active ? "hidden" : "flex")}>
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            {isCreator && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                disabled={available.length === 0}
                title={available.length === 0 ? "Every service already has a room" : "New room"}
                aria-label="New room"
                className="cursor-pointer rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search messages"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { key: "all", label: "All" },
                { key: "unread", label: totalUnread > 0 ? `Unread (${totalUnread})` : "Unread" },
                ...allRooms.map((r) => ({ key: r.serviceId, label: r.name })),
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setFilter(p.key)}
                  className={cn(
                    "max-w-[10rem] shrink-0 cursor-pointer truncate rounded-full border px-3 py-1 text-sm",
                    filter === p.key ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {data === null && !failed && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
            {failed && !data && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                Could not load messages.{" "}
                <button type="button" onClick={load} className="cursor-pointer font-semibold text-indigo-600 hover:underline">
                  Try again
                </button>
              </p>
            )}
            {data && allRooms.length > 0 && rooms.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-gray-500">
                {filter === "unread" && !q ? "You have no unread messages." : "No rooms match."}
              </p>
            )}
            {data && allRooms.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-gray-500">
                {isCreator
                  ? "No rooms yet. Use the button above to open a message room for one of your services."
                  : "Message rooms from your services will show up here."}
              </p>
            )}
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  setActiveId(room.id);
                  clearUnread(room.id);
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-gray-50",
                  room.id === activeId && "bg-gray-100 hover:bg-gray-100"
                )}
              >
                <RoomAvatar name={room.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-sm text-gray-900", room.unread > 0 ? "font-bold" : "font-semibold")}>{room.name}</span>
                    {room.last && (
                      <span className={cn("shrink-0 text-xs", room.unread > 0 ? "font-semibold text-indigo-600" : "text-gray-400")}>
                        {when(room.last.createdAt)}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("block truncate text-sm", room.unread > 0 ? "font-semibold text-gray-900" : "text-gray-500")}>
                      {room.last ? `${room.last.userName}: ${room.last.content}` : "No messages yet"}
                    </span>
                    {room.unread > 0 && !room.muted && (
                      <span className="min-w-[20px] shrink-0 rounded-full bg-indigo-600 px-1.5 text-center text-xs font-bold leading-5 text-white">
                        {room.unread > 99 ? "99+" : room.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={cn("min-w-0 flex-1", active ? "block" : "hidden md:block")}>
          {active ? (
            <Conversation
              key={active.id}
              room={active}
              isCreator={isCreator}
              onBack={() => setActiveId(null)}
              onRead={() => afterRead(active.id)}
              onMuted={(muted) => {
                setData((d) => (d ? { ...d, rooms: d.rooms.map((r) => (r.id === active.id ? { ...r, muted } : r)) } : d));
                window.dispatchEvent(new Event("messages-changed"));
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
              Choose a room to start chatting.
            </div>
          )}
        </div>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New message room">
        <div className="space-y-4 p-6 pt-2">
          <p className="text-sm text-gray-600">
            Everyone enrolled in the service can join the room and message each other.
          </p>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            aria-label="Service"
            className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
          >
            <option value="">Choose a service</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={createRoom} disabled={!serviceId} loading={saving}>
              Create room
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
