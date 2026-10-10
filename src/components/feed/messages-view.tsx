"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, MessageSquarePlus, Search, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setOpenRoom } from "@/lib/open-room";

interface Room {
  id: string;
  serviceId: string;
  name: string;
  unread: number;
  last: { userName: string; content: string; createdAt: string } | null;
}

interface Message {
  id: string;
  userName: string;
  role: "CREATOR" | "STUDENT";
  content: string;
  createdAt: string;
  mine: boolean;
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
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-base font-semibold text-indigo-700">
      {name.charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function Conversation({ room, onBack, onRead }: { room: Room; onBack: () => void; onRead: () => void }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
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
    setMessages(null);
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

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/rooms/${room.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send");
      stick.current = true;
      setMessages((m) => [...(m || []), data as Message]);
      setText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <button type="button" onClick={onBack} aria-label="Back to rooms" className="cursor-pointer rounded-lg p-1 hover:bg-gray-100 md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <RoomAvatar name={room.name} />
        <p className="truncate font-semibold text-gray-900">{room.name}</p>
      </div>

      <div
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2", m.mine ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900")}>
                {!m.mine && (
                  <p className="mb-0.5 text-xs font-semibold text-indigo-700">
                    {m.userName}
                    {m.role === "CREATOR" && <span className="ml-1.5 rounded bg-indigo-100 px-1 py-px text-[10px] font-bold uppercase">Host</span>}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                <p className={cn("mt-0.5 text-right text-[10px]", m.mine ? "text-indigo-200" : "text-gray-400")}>{when(m.createdAt)}</p>
              </div>
            </div>
          ))
        )}
        <div ref={end} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-gray-100 p-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Write a message..."
          className="min-w-0 flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
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
    <Card className="overflow-hidden">
      <div className="flex h-[calc(100vh-14rem)] min-h-[420px]">
        <div className={cn("w-full shrink-0 flex-col border-r border-gray-100 md:flex md:w-80", active ? "hidden" : "flex")}>
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
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
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
                  room.id === activeId && "bg-gray-100"
                )}
              >
                <RoomAvatar name={room.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-gray-900", room.unread > 0 ? "font-bold" : "font-semibold")}>{room.name}</span>
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
                    {room.unread > 0 && (
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
            <Conversation key={active.id} room={active} onBack={() => setActiveId(null)} onRead={() => afterRead(active.id)} />
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
    </Card>
  );
}
