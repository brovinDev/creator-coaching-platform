"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info } from "lucide-react";
import { MdHelpOutline } from "react-icons/md";
import toast from "react-hot-toast";

export type DripType = "enrolment" | "date" | "completion" | "none";

export interface DripSection {
  id: string;
  title: string;
  chapterCount: number;
  dripDays: string;
  dripDate: string;
}

const TYPES: { key: DripType; label: string; hint: string }[] = [
  {
    key: "enrolment",
    label: "Student enrolment date",
    hint: "As per the days added on each section, it will open for the customer from their purchase date.",
  },
  {
    key: "date",
    label: "On a specific date",
    hint: "As per the specific date added on each section, it will open for the customers.",
  },
  {
    key: "completion",
    label: "By completion",
    hint: "As the customer completes the opened section, the next section will open for them.",
  },
  {
    key: "none",
    label: "No drip",
    hint: "No restriction for the customers; all the sections are open for them.",
  },
];

const chapters = (n: number) => `${n} Published Chapter${n === 1 ? "" : "s"}`;

/** The "?" beside a drip type, with the explanation in a dark bubble on hover or focus. */
function Hint({ text }: { text: string }) {
  return (
    <span className="group/hint relative inline-flex">
      <button type="button" aria-label="What is this?" className="cursor-pointer text-gray-800">
        <MdHelpOutline className="h-5 w-5" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-3 hidden w-72 -translate-x-1/2 rounded-lg bg-[#222] px-4 py-3 text-left text-sm font-medium leading-5 text-white group-focus-within/hint:block group-hover/hint:block">
        <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-[#222]" />
        <span className="relative">{text}</span>
      </span>
    </span>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * A date box that opens a calendar. Days before today are greyed out and cannot be picked,
 * today has an outline and the chosen day is filled.
 */
function DateBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const todayIso = iso(new Date());
  const start = value ? new Date(`${value}T00:00:00`) : new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() });

  function shift(months: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + months, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  // Six weeks starting on the Sunday on or before the 1st of the month.
  const first = new Date(view.year, view.month, 1);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(view.year, view.month, 1 - first.getDay() + i));

  function pick(day: Date) {
    onChange(iso(day));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className={`flex h-[50px] w-[218px] cursor-pointer items-center justify-between rounded-md border bg-white px-4 ${
          open ? "border-indigo-600" : "border-gray-200"
        }`}
      >
        <span className={`text-lg ${value ? (open ? "text-indigo-600" : "text-black") : "text-gray-500"}`}>{value || "Select date"}</span>
        <Calendar className="h-5 w-5 text-gray-800" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-2 w-[352px] rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
              <div className="flex items-center gap-3 text-gray-400">
                <button type="button" aria-label="Previous year" onClick={() => shift(-12)} className="cursor-pointer hover:text-gray-700">
                  <ChevronsLeft className="h-5 w-5" />
                </button>
                <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="cursor-pointer hover:text-gray-700">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>
              <span className="text-lg font-medium text-black">
                {MONTHS[view.month].slice(0, 3)}&nbsp; {view.year}
              </span>
              <div className="flex items-center gap-3 text-gray-400">
                <button type="button" aria-label="Next month" onClick={() => shift(1)} className="cursor-pointer hover:text-gray-700">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button type="button" aria-label="Next year" onClick={() => shift(12)} className="cursor-pointer hover:text-gray-700">
                  <ChevronsRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-4 pb-3 pt-3">
              <div className="grid grid-cols-7">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="py-2 text-center text-lg text-black">
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((day) => {
                  const key = iso(day);
                  const past = key < todayIso;
                  const selected = key === value;
                  const today = key === todayIso;
                  const inMonth = day.getMonth() === view.month;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={past}
                      onClick={() => pick(day)}
                      className={`my-px h-[38px] text-lg ${
                        past
                          ? "cursor-not-allowed bg-gray-300 text-gray-500"
                          : selected
                            ? "cursor-pointer rounded-sm bg-indigo-600 font-medium text-white"
                            : today
                              ? "cursor-pointer rounded-sm border border-indigo-600 text-black"
                              : inMonth
                                ? "cursor-pointer text-black hover:bg-gray-100"
                                : "cursor-pointer text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-100 py-3 text-center">
              <button
                type="button"
                onClick={() => pick(new Date())}
                className="cursor-pointer text-lg text-[#1d86ff] hover:underline"
              >
                Today
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  courseId: string;
  initialType: DripType | "";
  sections: DripSection[];
  onSaved: () => void | Promise<void>;
}

export function CourseDripTab({ courseId, initialType, sections, onSaved }: Props) {
  // A course nobody has set up yet shows the first option, as TagMango does; with no days entered
  // everything is open, so nothing changes for the customer until the creator fills it in.
  const startType: DripType = initialType || "enrolment";
  const [type, setType] = useState<DripType>(startType);
  const [days, setDays] = useState<Record<string, string>>(() => Object.fromEntries(sections.map((s) => [s.id, s.dripDays])));
  const [dates, setDates] = useState<Record<string, string>>(() => Object.fromEntries(sections.map((s) => [s.id, s.dripDate])));
  const [saving, setSaving] = useState(false);

  const snapshot = (t: DripType, d: Record<string, string>, dt: Record<string, string>) => JSON.stringify([t, d, dt]);
  const [baseline, setBaseline] = useState(() => snapshot(startType, days, dates));
  const dirty = snapshot(type, days, dates) !== baseline;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dripType: type }),
      });
      if (!res.ok) throw new Error("Could not save the drip type");

      for (const s of sections) {
        const r = await fetch(`/api/courses/${courseId}/modules/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dripDays: days[s.id] ?? "", dripDate: dates[s.id] ?? "" }),
        });
        if (!r.ok) throw new Error(`Could not save "${s.title}"`);
      }

      setBaseline(snapshot(type, days, dates));
      toast.success("Drip schedule saved");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[27px] font-semibold text-black">Drip schedule</h2>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="h-[45px] cursor-pointer rounded-md bg-indigo-600 px-6 text-lg font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-black disabled:hover:bg-gray-200"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <h3 className="mt-10 text-[22px] font-semibold text-black">Drip type</h3>
      <p className="mt-2 text-base text-gray-700">Select when the content will be unlocked.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TYPES.map((t) => {
          const on = type === t.key;
          return (
            <div
              key={t.key}
              onClick={() => setType(t.key)}
              className={`flex h-[51px] cursor-pointer items-center gap-3 rounded-md border bg-white px-4 ${
                on ? "border-indigo-600" : "border-gray-200"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  on ? "border-indigo-600" : "border-gray-300"
                }`}
              >
                {on && <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />}
              </span>
              <span className="text-lg text-black">{t.label}</span>
              <Hint text={t.hint} />
            </div>
          );
        })}
      </div>

      {type === "none" ? (
        <div className="mt-10 rounded-xl border border-gray-200 p-5">
          <h4 className="text-xl font-semibold text-gray-900">No drip action</h4>
          <p className="mt-4 pb-2 text-base text-gray-700">Customers can access all the sections and chapters</p>
        </div>
      ) : sections.length === 0 ? (
        <p className="mt-10 rounded-xl border border-gray-200 p-5 text-base text-gray-600">
          Add a section in the Curriculum tab first, then set when it unlocks here.
        </p>
      ) : (
        <div className="mt-10 space-y-5">
          {sections.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-gray-200 p-5">
              <h4 className="text-xl font-semibold text-gray-900">
                Section {i + 1}: {s.title}
              </h4>
              <p className="mt-3 text-[15px] text-gray-700">{chapters(s.chapterCount)}</p>

              {type === "enrolment" && (
                <div className="mt-5 flex flex-wrap items-center gap-4 text-lg text-gray-900">
                  <span>will be unlocked</span>
                  <div className="flex h-[50px] items-stretch overflow-hidden rounded-md border border-gray-200 bg-white">
                    <input
                      inputMode="numeric"
                      value={days[s.id] ?? ""}
                      onChange={(e) => setDays((d) => ({ ...d, [s.id]: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                      aria-label={`Days after enrolment for ${s.title}`}
                      className="w-[98px] px-4 text-lg text-black focus:outline-none"
                    />
                    <span className="flex items-center border-l border-gray-200 px-4 text-lg text-black">days</span>
                  </div>
                  <span>after enrolment</span>
                </div>
              )}

              {type === "date" && (
                <div className="mt-5 flex flex-wrap items-center gap-4 text-lg text-gray-900">
                  <span>will be unlocked on</span>
                  <DateBox value={dates[s.id] ?? ""} onChange={(v) => setDates((d) => ({ ...d, [s.id]: v }))} />
                </div>
              )}

              {type === "completion" && (
                <p className="mt-5 flex items-center gap-3 text-lg text-gray-900">
                  <Info className="h-5 w-5 shrink-0" />
                  {i === 0
                    ? "This section is by default open for the customers"
                    : `This section opens when the customer completes Section ${i}: ${sections[i - 1].title}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
