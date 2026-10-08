"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, MoreHorizontal, Plus, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface FunnelRow {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  serviceId: string;
  serviceTitle: string;
}

const COLUMNS = "grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_110px_minmax(0,170px)]";

export default function WebinarPagesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<FunnelRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  // Where the open row menu sits on screen. It floats above the table, which scrolls sideways on small screens.
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/funnels");
    setRows(res.ok ? await res.json() : []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Close the row menu when clicking anywhere else.
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const hide = () => setMenu(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  const urlOf = (slug: string) => `${window.location.origin}/w/${slug}`;

  async function create() {
    setCreating(true);
    const res = await fetch("/api/funnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "webinar" }),
    });
    if (!res.ok) {
      setCreating(false);
      return toast.error("Could not start a new page");
    }
    router.push(`/creator/page-builder/${(await res.json()).id}`);
  }

  async function setLive(row: FunnelRow, live: boolean) {
    setBusy(row.id);
    const res = await fetch(`/api/funnels/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: live }),
    });
    setBusy(null);
    if (!res.ok) {
      toast.error((await res.json().catch(() => null))?.error || "Could not update the page");
      return;
    }
    toast.success(live ? "Page published" : "Page unpublished");
    load();
  }

  async function remove(row: FunnelRow) {
    setMenu(null);
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/funnels/${row.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete the page");
    toast.success("Page deleted");
    load();
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div ref={boxRef} className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 p-5">
        <h1 className="text-xl font-bold text-gray-900">Webinar / Workshop Pages</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Refresh"
            onClick={load}
            className="cursor-pointer rounded-lg bg-gray-100 p-2.5 text-gray-700 hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Button onClick={create} loading={creating} className="bg-gray-900 hover:bg-black">
            <Plus className="h-4 w-4" /> Create new page
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className={`grid ${COLUMNS} gap-4 border-y border-gray-200 px-5 py-3 text-sm font-semibold text-gray-900`}>
            <span>Service</span>
            <span>Link</span>
            <span>Page Title</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {rows === null && <p className="px-5 py-10 text-center text-sm text-gray-400">Loading...</p>}
          {rows?.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-gray-500">
              No pages yet. Click &ldquo;Create new page&rdquo; and answer a few simple questions.
            </p>
          )}

          {rows?.map((row) => (
            <div key={row.id} className={`grid ${COLUMNS} items-center gap-4 border-b border-gray-100 px-5 py-4 last:border-b-0 hover:bg-gray-50`}>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{row.serviceTitle || "No service chosen yet"}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  Page ID: {row.id}
                  <button type="button" aria-label="Copy page ID" onClick={() => copy(row.id, "Page ID")} className="cursor-pointer text-gray-400 hover:text-gray-700">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </p>
              </div>

              <div className="min-w-0 text-sm">
                {row.published ? (
                  <span className="flex items-center gap-1.5">
                    <a href={urlOf(row.slug)} target="_blank" rel="noreferrer" className="truncate text-indigo-600 hover:underline">
                      {urlOf(row.slug)}
                    </a>
                    <button type="button" aria-label="Copy link" onClick={() => copy(urlOf(row.slug), "Link")} className="shrink-0 cursor-pointer text-gray-400 hover:text-gray-700">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <span className="text-gray-900">Publish to get a link</span>
                )}
              </div>

              <p className="truncate text-sm font-semibold text-gray-900">{row.title}</p>

              <span>
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase text-white ${row.published ? "bg-green-600" : "bg-red-500"}`}
                >
                  {row.published ? "Published" : "Unpublished"}
                </span>
              </span>

              <div className="relative flex items-center justify-end gap-2">
                <Button size="sm" variant="secondary" loading={busy === row.id} onClick={() => (row.published ? setLive(row, false) : setLive(row, true))}>
                  {row.published ? "Unpublish" : "Publish"}
                </Button>
                <button
                  type="button"
                  aria-label="More actions"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setMenu(menu?.id === row.id ? null : { id: row.id, top: r.bottom + 4, right: window.innerWidth - r.right });
                  }}
                  className="cursor-pointer rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menu?.id === row.id && (
                  <div
                    style={{ top: menu.top, right: menu.right }}
                    className="fixed z-50 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg"
                  >
                    <button className="block w-full cursor-pointer px-4 py-2 text-left hover:bg-gray-50" onClick={() => router.push(`/creator/page-builder/${row.id}`)}>
                      Edit page
                    </button>
                    {row.published && (
                      <a className="block px-4 py-2 hover:bg-gray-50" href={`/w/${row.slug}`} target="_blank" rel="noreferrer" onClick={() => setMenu(null)}>
                        Open page
                      </a>
                    )}
                    <button className="block w-full cursor-pointer px-4 py-2 text-left text-red-600 hover:bg-red-50" onClick={() => remove(row)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
