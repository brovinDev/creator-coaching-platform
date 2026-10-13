"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Download, RotateCw, Search } from "lucide-react";
import { DateBox, Hint } from "@/components/creator/course-drip-tab";

/** One assignment's results across the learners who attempted it. */
export interface AssignmentRow {
  id: string;
  title: string;
  submissions: number;
  /** Percentages, 0-100; the score is out of the assignment's own total. */
  dropOffRate: number;
  avgScore: number;
  passingRate: number;
  retakingRate: number;
  /** Average minutes taken to submit. */
  avgMinutes: number;
}

const STATS: { key: string; label: string; hint: string; wide?: boolean }[] = [
  { key: "submission", label: "Submission Rate", hint: "Share of learners who submitted at least one assignment." },
  { key: "score", label: "Average Score", hint: "Average score across all submissions." },
  { key: "passing", label: "Passing %", hint: "Share of submissions that reached the passing score." },
  { key: "retake", label: "Retake %", hint: "Share of learners who attempted an assignment more than once.", wide: true },
  { key: "dropoff", label: "Drop-off Rate before Submission", hint: "Share of learners who opened an assignment but never submitted it.", wide: true },
];

const COLS = "grid-cols-[minmax(160px,1.4fr)_minmax(130px,1fr)_minmax(130px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(110px,1fr)]";

/**
 * Results of the course's assignments. Assignments cannot be created in the curriculum yet, so for now
 * this shows the empty state; `assignments` is where their results will come in.
 */
export function CourseAssignmentsTab({ assignments = [] }: { assignments?: AssignmentRow[] }) {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const q = query.trim().toLowerCase();
  const rows = assignments.filter((a) => !q || a.title.toLowerCase().includes(q));

  const total = assignments.reduce((sum, a) => sum + a.submissions, 0);
  const avg = (pick: (a: AssignmentRow) => number) =>
    total ? Math.round(assignments.reduce((sum, a) => sum + pick(a) * a.submissions, 0) / total) : null;
  const values: Record<string, string> = {
    submission: "—",
    score: avg((a) => a.avgScore) === null ? "—" : String(avg((a) => a.avgScore)),
    passing: avg((a) => a.passingRate) === null ? "—" : `${avg((a) => a.passingRate)}%`,
    retake: avg((a) => a.retakingRate) === null ? "—" : `${avg((a) => a.retakingRate)}%`,
    dropoff: avg((a) => a.dropOffRate) === null ? "—" : `${avg((a) => a.dropOffRate)}%`,
  };

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      ["Title", "Submissions", "Drop-off Rate %", "Avg. Score", "Passing %", "Retaking %", "Avg. Time (min)"].map(esc).join(","),
      ...rows.map((a) => [a.title, a.submissions, a.dropOffRate, a.avgScore, a.passingRate, a.retakingRate, a.avgMinutes].map(esc).join(",")),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "assignment-responses.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const card = (s: (typeof STATS)[number]) => (
    <div key={s.key} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
      <p className="flex items-center gap-1.5 text-lg text-gray-700">
        {s.label}
        <Hint text={s.hint} />
      </p>
      <p className="mt-4 pb-2 text-3xl font-semibold text-black">{values[s.key]}</p>
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
        <div>
          <h2 className="text-[27px] font-semibold text-black">Assignment Responses</h2>
          <p className="mt-1 text-[17px] text-gray-700">Track learner submissions and performance across all course assignments.</p>
        </div>
        <div className="flex h-[50px] items-center rounded-md border border-gray-200 pr-4">
          <DateBox value={from} onChange={setFrom} allowPast bare placeholder="Start date" />
          <span className="text-gray-500">&rarr;</span>
          <DateBox value={to} onChange={setTo} allowPast bare placeholder="End date" />
          <Calendar className="h-5 w-5 text-gray-800" />
        </div>
      </div>

      <div className="mx-5 mt-10 rounded-xl border border-gray-200 p-4">
        <div className="grid gap-4 md:grid-cols-3">{STATS.filter((s) => !s.wide).map(card)}</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{STATS.filter((s) => s.wide).map(card)}</div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-3">
          <div className="relative w-[500px] max-w-full">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-800" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by assignment title"
              className="h-[50px] w-full rounded-md border border-gray-200 pl-12 pr-4 text-lg text-black placeholder:text-gray-600 focus:border-indigo-600 focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              setQuery("");
              setFrom("");
              setTo("");
            }}
            aria-label="Reset filters"
            className="flex h-[43px] w-[60px] cursor-pointer items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300"
          >
            <RotateCw className="h-5 w-5 text-black" />
          </button>
        </div>
        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="flex h-[45px] cursor-pointer items-center gap-2 rounded-md bg-gray-500 px-5 text-lg font-semibold text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:bg-gray-500"
        >
          <Download className="h-5 w-5" /> Export CSV
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[950px]">
          <div className={`grid ${COLS} items-center border-y border-gray-200 text-lg text-black`}>
            {["Title", "Submissions", "Drop-off Rate", "Avg. Score", "Passing %", "Retaking %", "Avg. Time"].map((h, i) => (
              <div key={h} className={`px-5 py-5 ${i > 0 ? "border-l border-gray-200" : ""}`}>
                {h}
              </div>
            ))}
          </div>
          {rows.map((a) => (
            <div key={a.id} className={`grid ${COLS} items-center border-b border-gray-200 text-lg text-black hover:bg-gray-50`}>
              <div className="truncate px-5 py-5 font-medium">{a.title}</div>
              <div className="px-5 py-5">{a.submissions}</div>
              <div className="px-5 py-5">{a.dropOffRate}%</div>
              <div className="px-5 py-5">{a.avgScore}</div>
              <div className="px-5 py-5">{a.passingRate}%</div>
              <div className="px-5 py-5">{a.retakingRate}%</div>
              <div className="px-5 py-5">{a.avgMinutes} min</div>
            </div>
          ))}
        </div>
      </div>
      {rows.length === 0 && (
        <p className="border-b border-gray-200 py-6 text-center text-lg text-gray-600">No assignments found</p>
      )}

      <div className="flex items-center justify-end gap-3 px-5 pt-5">
        <button disabled aria-label="Previous page" className="flex h-[45px] w-[45px] items-center justify-center rounded-md bg-gray-100 text-gray-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="text-lg text-black">1</span>
        <button disabled aria-label="Next page" className="flex h-[45px] w-[45px] items-center justify-center rounded-md bg-gray-100 text-gray-400">
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
