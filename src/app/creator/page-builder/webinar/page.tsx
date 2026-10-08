"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Plus, Presentation } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface FunnelRow {
  id: string;
  title: string;
  slug: string;
  published: boolean;
}

export default function WebinarPagesPage() {
  const router = useRouter();
  const [funnels, setFunnels] = useState<FunnelRow[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/funnels")
      .then((r) => (r.ok ? r.json() : []))
      .then(setFunnels);
  }, []);

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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webinar / Workshop pages</h1>
          <p className="mt-1 text-gray-500">Each one is a 3-page funnel: landing page, registration, thank you.</p>
        </div>
        <Button onClick={create} loading={creating}><Plus className="h-4 w-4" /> New webinar page</Button>
      </div>

      {funnels && funnels.length === 0 && (
        <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <Presentation className="mx-auto h-8 w-8 text-indigo-600" />
          <p className="mt-3 font-semibold text-gray-900">No pages yet</p>
          <p className="mt-1 text-sm text-gray-500">Answer a few simple questions and your page is ready.</p>
        </div>
      )}

      {funnels && funnels.length > 0 && (
        <div className="mt-8">
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {funnels.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/creator/page-builder/${f.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{f.title}</Link>
                  <p className="text-xs text-gray-500">{f.published ? "Live" : "Draft"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {f.published && (
                    <a href={`/w/${f.slug}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700" aria-label="Open page"><ExternalLink className="h-4 w-4" /></a>
                  )}
                  <Link href={`/creator/page-builder/${f.id}`}><Button variant="outline" size="sm">Edit</Button></Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
