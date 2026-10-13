"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search, User, X } from "lucide-react";
import { MdUnfoldMore } from "react-icons/md";

interface Learner {
  userId: string;
  name: string;
  email: string;
  phone: string;
  completedChapters: number;
  completion: number;
  purchasedOn: string | null;
  firstProgressOn: string | null;
  lastProgressOn: string | null;
}

interface ChapterRow {
  id: string;
  title: string;
  section: string;
  sectionIndex: number;
  index: number;
  users: { userId: string; name: string; email: string }[];
}

interface Report {
  totalChapters: number;
  learners: Learner[];
  chapters: ChapterRow[];
}

type SubTab = "course" | "chapter" | "leaderboard";
type SortKey = "completion" | "purchasedOn" | "firstProgressOn" | "lastProgressOn";

const BUCKETS: { label: string; test: (pct: number) => boolean }[] = [
  { label: "0% - 1%", test: (p) => p <= 1 },
  { label: "1% - 25%", test: (p) => p > 1 && p <= 25 },
  { label: "26% - 50%", test: (p) => p > 25 && p <= 50 },
  { label: "51% - 75%", test: (p) => p > 50 && p <= 75 },
  { label: "76% - 99%", test: (p) => p > 75 && p < 100 },
  { label: "100%", test: (p) => p >= 100 },
];

const fmtDate = (iso: string | null) =>
  iso && !Number.isNaN(new Date(iso).getTime())
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "-";

const plural = (n: number) => `${n} user${n === 1 ? "" : "s"}`;
const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function Avatar() {
  return (
    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#4a4a5a]">
      <User className="h-4 w-4 text-white" />
    </span>
  );
}

/** The magnifying glass shown when a table has nothing to list. */
export function EmptyIllustration() {
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" aria-hidden>
      <circle cx="68" cy="70" r="62" fill="#eceef2" />
      <circle cx="68" cy="66" r="30" fill="#b9dcf7" />
      <circle cx="68" cy="66" r="24" fill="#59aeea" />
      <circle cx="68" cy="66" r="7" fill="#8cc7f2" />
      <path d="M86 90l22 36" stroke="#c4752e" strokeWidth="9" strokeLinecap="round" />
      <circle cx="122" cy="18" r="6" fill="#f2c230" />
      <circle cx="26" cy="102" r="6" fill="#f2c230" />
      <circle cx="138" cy="34" r="2.5" fill="#a99bd6" />
      <circle cx="22" cy="44" r="2.5" fill="#a99bd6" />
      <circle cx="42" cy="132" r="2.5" fill="#a99bd6" />
      <circle cx="132" cy="108" r="2.5" fill="#f2c230" />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
    </div>
  );
}

function CourseCompletion({ report }: { report: Report }) {
  const users = report.learners;
  const average = users.length ? Math.round(users.reduce((sum, l) => sum + l.completion, 0) / users.length) : 0;
  const radius = 100;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="px-4 pb-5 pt-4">
          <h3 className="text-[27px] font-semibold text-gray-900">Percentage Breakdown</h3>
          <p className="mt-1 text-[17px] text-gray-700">Percentage of completion by users</p>
        </div>
        <div className="grid grid-cols-[1fr_1fr] border-y border-gray-200 text-lg text-black">
          <div className="px-5 py-5">Percentage of Completion</div>
          <div className="border-l border-gray-200 px-5 py-5 font-medium">All Users ({users.length})</div>
        </div>
        {BUCKETS.map((b) => {
          const count = users.filter((l) => b.test(l.completion)).length;
          return (
            <div key={b.label} className="grid grid-cols-[1fr_1fr] border-b border-gray-200 text-[17px] text-gray-800 last:border-b-0 hover:bg-gray-50">
              <div className="flex items-center px-5 py-5">{b.label}</div>
              <div className="flex items-center gap-3 px-5 py-4">
                <Avatar />
                <span>
                  {plural(count)} ({percent(count, users.length)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="text-[27px] font-semibold text-gray-900">Average Completion Rate</h3>
        <p className="mt-1 text-[17px] text-gray-700">Percentage of chapters marked as completed</p>
        <div className="relative mx-auto mt-16 h-[230px] w-[230px]">
          <svg viewBox="0 0 230 230" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="115" cy="115" r={radius} fill="none" stroke="#e0e0e0" strokeWidth="14" />
            <circle
              cx="115"
              cy="115"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-indigo-600"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - average / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-gray-900">
              <span className="text-[44px] font-semibold leading-none">{average}</span>
              <span className="ml-1 text-2xl font-semibold">%</span>
            </p>
            <p className="mt-2 text-[17px] text-gray-600">No of Users: {users.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChapterCompletion({ report }: { report: Report }) {
  const [viewing, setViewing] = useState<ChapterRow | null>(null);
  const total = report.learners.length;
  const empty = report.chapters.length === 0 || total === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 px-4 pb-5 pt-4">
        <h3 className="text-[27px] font-semibold text-gray-900">Percentage Breakdown</h3>
        <p className="mt-1 text-[17px] text-gray-700">Percentage of users who completed a chapter</p>
      </div>
      <div className="grid grid-cols-[1fr_250px_250px] border-b border-gray-200 text-lg text-black">
        <div className="px-5 py-6">Chapter</div>
        <div className="border-l border-gray-200 px-5 py-6">Users</div>
        <div className="border-l border-gray-200 px-5 py-6">Action</div>
      </div>

      {empty ? (
        <div className="flex flex-col items-center px-4 pb-20 pt-24">
          <EmptyIllustration />
          <p className="mt-6 text-lg text-gray-600">Percentage of users who completed a chapter will appear here</p>
        </div>
      ) : (
        report.chapters.map((c) => (
          <div key={c.id} className="grid grid-cols-[1fr_250px_250px] items-center border-b border-gray-200 text-[17px] text-gray-800 last:border-b-0 hover:bg-gray-50">
            <div className="px-5 py-4">
              <p className="font-medium text-black">
                Chapter {c.index}: {c.title}
              </p>
              <p className="mt-0.5 text-sm text-gray-600">
                Section {c.sectionIndex}: {c.section}
              </p>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <Avatar />
              <span>
                {plural(c.users.length)} ({percent(c.users.length, total)}%)
              </span>
            </div>
            <div className="px-5 py-4">
              <button
                onClick={() => setViewing(c)}
                disabled={c.users.length === 0}
                className="h-10 cursor-pointer rounded-md bg-gray-200 px-5 text-base font-semibold text-black hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                View users
              </button>
            </div>
          </div>
        ))
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-16"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewing(null);
          }}
        >
          <div className="w-full max-w-[560px] rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-black">
                  Chapter {viewing.index}: {viewing.title}
                </h3>
                <p className="mt-1 text-base text-gray-600">{plural(viewing.users.length)} completed this chapter</p>
              </div>
              <button onClick={() => setViewing(null)} aria-label="Close" className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="mt-5 max-h-[50vh] divide-y divide-gray-100 overflow-y-auto">
              {viewing.users.map((u) => (
                <li key={u.userId} className="flex items-center gap-3 py-3">
                  <Avatar />
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-black">{u.name}</p>
                    {u.email && <p className="truncate text-sm text-gray-600">{u.email}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Leaderboard({ report }: { report: Report }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "completion", dir: "desc" });

  // Rank follows completion (ties share the better position), whatever column is sorted on screen.
  const ranked = useMemo(() => {
    const byCompletion = [...report.learners].sort((a, b) => b.completion - a.completion);
    return byCompletion.map((l) => ({ ...l, rank: byCompletion.findIndex((x) => x.completion === l.completion) + 1 }));
  }, [report.learners]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? ranked.filter((l) => [l.name, l.email, l.phone].some((v) => v.toLowerCase().includes(q)))
      : ranked;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // missing dates always last
      if (bv == null) return -1;
      return av < bv ? -sign : av > bv ? sign : 0;
    });
  }, [ranked, query, sort]);

  function toggle(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      ["Rank", "User", "Email", "Phone", "Completion %", "Purchased On", "First Progress On", "Last Progress On"].map(esc).join(","),
      ...rows.map((l) =>
        [l.rank, l.name, l.email, l.phone, l.completion, fmtDate(l.purchasedOn), fmtDate(l.firstProgressOn), fmtDate(l.lastProgressOn)]
          .map(esc)
          .join(",")
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "course-leaderboard.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // A function returning JSX, not a component, so it is not recreated as a new component type each render.
  const sortable = (k: SortKey, label: string) => (
    <button onClick={() => toggle(k)} className="flex w-full cursor-pointer items-center justify-between text-left">
      <span>{label}</span>
      <MdUnfoldMore className={`h-5 w-5 ${sort.key === k ? "text-black" : "text-gray-700"}`} />
    </button>
  );

  const COLS = "grid-cols-[80px_minmax(150px,1.1fr)_minmax(150px,1.1fr)_150px_170px_190px_190px]";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="px-4 pb-4 pt-4">
        <h3 className="text-[27px] font-semibold text-gray-900">Leaderboard</h3>
        <p className="mt-1 text-[17px] text-gray-700">List of users sorted by completion % and organized by progress level</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-[625px]">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone or email"
              className="h-[50px] w-full rounded-md border border-gray-200 pl-12 pr-4 text-lg text-black placeholder:text-gray-600 focus:border-gray-400 focus:outline-none"
            />
          </div>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="flex h-[50px] cursor-pointer items-center gap-2 rounded-md bg-gray-200 px-5 text-lg font-medium text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 disabled:hover:bg-gray-200"
          >
            <Download className="h-5 w-5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1050px]">
          <div className={`grid ${COLS} border-y border-gray-200 text-lg text-black`}>
            <div className="px-4 py-5">Rank</div>
            <div className="border-l border-gray-200 px-4 py-5">User</div>
            <div className="border-l border-gray-200 px-4 py-5">Contact</div>
            <div className="border-l border-gray-200 px-4 py-5">{sortable("completion", "Completion")}</div>
            <div className="border-l border-gray-200 px-4 py-5">{sortable("purchasedOn", "Purchased On")}</div>
            <div className="border-l border-gray-200 px-4 py-5">{sortable("firstProgressOn", "First Progress On")}</div>
            <div className="border-l border-gray-200 px-4 py-5">{sortable("lastProgressOn", "Last Progress On")}</div>
          </div>

          {rows.map((l) => (
            <div key={l.userId} className={`grid ${COLS} items-center border-b border-gray-200 text-[17px] text-gray-800 hover:bg-gray-50`}>
              <div className="px-4 py-4">{l.rank}</div>
              <div className="min-w-0 px-4 py-4">
                <p className="truncate font-medium text-black">{l.name}</p>
              </div>
              <div className="min-w-0 px-4 py-4">
                <p className="truncate">{l.phone || l.email || "-"}</p>
                {l.phone && l.email && <p className="truncate text-sm text-gray-600">{l.email}</p>}
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                    <span className="block h-full rounded-full bg-indigo-600" style={{ width: `${l.completion}%` }} />
                  </span>
                  <span>{l.completion}%</span>
                </div>
              </div>
              <div className="px-4 py-4">{fmtDate(l.purchasedOn)}</div>
              <div className="px-4 py-4">{fmtDate(l.firstProgressOn)}</div>
              <div className="px-4 py-4">{fmtDate(l.lastProgressOn)}</div>
            </div>
          ))}
        </div>
      </div>

      {rows.length === 0 && (
        <div className="flex flex-col items-center px-4 pb-16 pt-16">
          <EmptyIllustration />
          <p className="mt-6 text-xl font-medium text-black">No users found!</p>
          <p className="mt-2 text-lg text-gray-600">List of users with individual completion % and last visit will appear here</p>
        </div>
      )}
    </div>
  );
}

export function CourseReportTab({ courseId }: { courseId: string }) {
  const [tab, setTab] = useState<SubTab>("course");
  const [report, setReport] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/courses/${courseId}/report`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Report) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const TABS: { key: SubTab; label: string }[] = [
    { key: "course", label: "Course Completion" },
    { key: "chapter", label: "Chapter Completion" },
    { key: "leaderboard", label: "Leaderboard" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-[27px] font-semibold text-black">Reports</h2>
      <div className="mt-5 flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`h-[50px] cursor-pointer rounded-md px-5 text-lg ${
              tab === t.key ? "bg-indigo-600 font-medium text-white" : "text-black hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {failed ? (
          <p className="py-12 text-center text-base text-gray-600">Could not load the report. Please refresh and try again.</p>
        ) : !report ? (
          <Spinner />
        ) : tab === "course" ? (
          <CourseCompletion report={report} />
        ) : tab === "chapter" ? (
          <ChapterCompletion report={report} />
        ) : (
          <Leaderboard report={report} />
        )}
      </div>
    </div>
  );
}
