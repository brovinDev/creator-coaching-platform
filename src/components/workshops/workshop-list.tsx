"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, ExternalLink, Loader2, Pencil, RefreshCw, Repeat, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WorkshopDrawer } from "./workshop-drawer";

export interface SessionItem {
  key: string;
  workshopId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  hostName: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  recurring: boolean;
  status: "upcoming" | "live" | "completed";
  joinUrl: string;
  serviceNames?: string[];
}

type Tab = "upcoming" | "completed";

export function formatSessionTime(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const day = start.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time(start)} - ${time(new Date(endAt))}`;
}

function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}

function SessionCard({ session, isCreator, onEdit }: { session: SessionItem; isCreator: boolean; onEdit: (id: string) => void }) {
  const completed = session.status === "completed";
  return (
    <Card>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="h-28 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-24 sm:w-40">
          {session.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <Video className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-gray-900">{session.title}</h3>
            {session.status === "live" && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Live window</span>
            )}
            {session.recurring && (
              <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">
                <Repeat className="h-3 w-3" /> Recurring
              </span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
            <CalendarClock className="h-4 w-4 shrink-0" />
            {formatSessionTime(session.startAt, session.endAt)} · {duration(session.durationMinutes)}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">Hosted by {session.hostName}</p>
          {isCreator && session.serviceNames && session.serviceNames.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-gray-400">Linked to: {session.serviceNames.join(", ")}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
          {session.joinUrl ? (
            <a
              href={session.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {isCreator ? "Open meeting" : "Join now"} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            !completed &&
            !isCreator && <p className="max-w-[180px] text-right text-xs text-gray-500">The join button appears 15 minutes before the start.</p>
          )}
          {isCreator && (
            <button
              type="button"
              onClick={() => onEdit(session.workshopId)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function WorkshopList({
  isCreator,
  hostName,
  openNew = false,
}: {
  isCreator: boolean;
  hostName: string;
  /** Open the create drawer straight away (from the Create menu). */
  openNew?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [refreshes, setRefreshes] = useState(0);
  // The request each result belongs to: anything older than the current one counts as loading.
  const [result, setResult] = useState<{ id: string; sessions: SessionItem[] | null } | null>(null);
  const [drawer, setDrawer] = useState<{ id: string | null } | null>(openNew && isCreator ? { id: null } : null);

  const query = new URLSearchParams({ tab });
  if (from) query.set("from", new Date(`${from}T00:00:00`).toISOString());
  if (to) query.set("to", new Date(`${to}T23:59:59`).toISOString());
  const requestId = `${query}|${refreshes}`;
  const queryString = query.toString();

  useEffect(() => {
    const id = `${queryString}|${refreshes}`;
    let cancelled = false;
    fetch(`/api/workshops?${queryString}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((sessions: SessionItem[]) => !cancelled && setResult({ id, sessions }))
      .catch(() => !cancelled && setResult({ id, sessions: null }));
    return () => {
      cancelled = true;
    };
  }, [queryString, refreshes]);

  const load = useCallback(() => setRefreshes((n) => n + 1), []);
  const current = result?.id === requestId ? result : null;
  const sessions = current?.sessions ?? null;
  const failed = current !== null && current.sessions === null;

  const closeDrawer = useCallback(() => setDrawer(null), []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Workshops</h1>

      <div className="mb-4 flex gap-6 border-b border-gray-200">
        {(["upcoming", "completed"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "-mb-px cursor-pointer border-b-2 px-1 pb-3 text-base font-medium capitalize",
              tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-900"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input type="date" aria-label="Start date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
          <span className="text-gray-400">→</span>
          <input type="date" aria-label="End date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
        </div>
        <button
          type="button"
          aria-label="Refresh"
          onClick={load}
          className="flex h-10 w-12 cursor-pointer items-center justify-center rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        {(from || to) && (
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="cursor-pointer text-sm text-gray-500 hover:text-gray-800"
          >
            Clear dates
          </button>
        )}
        {isCreator && (
          <button
            type="button"
            onClick={() => setDrawer({ id: null })}
            className="ml-auto cursor-pointer rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Schedule a workshop
          </button>
        )}
      </div>

      {tab === "completed" && isCreator && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-gray-700">
          Recordings are not available yet. They arrive with the Zoom integration.
        </p>
      )}

      {sessions === null && !failed && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
      {failed && (
        <Card>
          <div className="p-8 text-center text-sm text-gray-500">
            Could not load workshops.{" "}
            <button type="button" onClick={load} className="cursor-pointer font-semibold text-indigo-600 hover:underline">
              Try again
            </button>
          </div>
        </Card>
      )}
      {sessions && sessions.length === 0 && (
        <Card>
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <CalendarClock className="mb-4 h-14 w-14 text-gray-400" />
            <p className="text-lg font-semibold text-gray-900">You do not have any {tab} workshops yet...</p>
            <p className="mt-1 text-sm text-gray-500">
              {isCreator ? (
                <>
                  To schedule single or recurring workshops, simply click{" "}
                  <button type="button" onClick={() => setDrawer({ id: null })} className="cursor-pointer font-medium text-indigo-600 hover:underline">
                    schedule a workshop
                  </button>
                </>
              ) : (
                "Workshops for the services you own will show up here."
              )}
            </p>
          </div>
        </Card>
      )}
      <div className="space-y-3">
        {sessions?.map((s) => (
          <SessionCard key={s.key} session={s} isCreator={isCreator} onEdit={(id) => setDrawer({ id })} />
        ))}
      </div>

      {drawer && (
        <WorkshopDrawer
          workshopId={drawer.id}
          hostName={hostName}
          onClose={closeDrawer}
          onSaved={() => {
            setDrawer(null);
            load();
          }}
        />
      )}
    </div>
  );
}
