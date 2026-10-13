"use client";

import { useEffect, useState } from "react";
import { Avatar, ThreadPanel, fmtDate } from "@/components/creator/course-comments-tab";
import { EmptyIllustration } from "@/components/creator/course-report-tab";

interface Question {
  id: string;
  content: string;
  userName: string;
  userAvatar: string | null;
  chapterTitle: string;
  createdAt: string | null;
  isRead: boolean;
  replies: number;
}

const COLS = "grid-cols-[minmax(280px,1.6fr)_minmax(200px,1fr)_minmax(220px,1.2fr)_150px_110px]";

/** Questions learners asked on the course's chapters; opening one lets the creator answer it. */
export function CourseQnaTab({ courseId }: { courseId: string }) {
  const [rows, setRows] = useState<Question[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/courses/${courseId}/comments?kind=question`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { comments: Question[] }) => {
        if (!cancelled) setRows(data.comments);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="px-5 pb-5 pt-5">
        <h2 className="text-[27px] font-semibold text-black">QnAs</h2>
        <p className="mt-1 text-[17px] text-gray-700">List of all the questions on your course</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className={`grid ${COLS} items-center border-y border-gray-200 text-lg text-black`}>
            <div className="px-5 py-5">Question</div>
            <div className="border-l border-gray-200 px-5 py-5">User</div>
            <div className="border-l border-gray-200 px-5 py-5">Chapter</div>
            <div className="border-l border-gray-200 px-5 py-5">Created at</div>
            <div className="border-l border-gray-200 px-5 py-5 text-right">Action</div>
          </div>

          {(rows ?? []).map((q) => (
            <div key={q.id} className={`grid ${COLS} items-center border-b border-gray-200 text-lg text-black hover:bg-gray-50`}>
              <div className={`truncate px-5 py-5 ${q.isRead ? "" : "font-semibold"}`}>{q.content}</div>
              <div className="flex min-w-0 items-center gap-2 px-5 py-4">
                <Avatar src={q.userAvatar} size={30} />
                <span className="truncate">{q.userName}</span>
              </div>
              <div className="truncate px-5 py-5">{q.chapterTitle || "-"}</div>
              <div className="px-5 py-5">{fmtDate(q.createdAt)}</div>
              <div className="px-5 py-5 text-right">
                <button onClick={() => setOpen(q.id)} className="cursor-pointer text-lg text-indigo-600 hover:underline">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {failed ? (
        <p className="py-16 text-center text-base text-gray-600">Could not load the questions. Please refresh and try again.</p>
      ) : !rows ? (
        <div className="flex justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center px-4 pb-20 pt-14">
          <EmptyIllustration />
          <p className="mt-6 text-lg text-gray-600">Manage all the questions across different chapters from here</p>
        </div>
      ) : null}

      {open && (
        <ThreadPanel
          key={open}
          courseId={courseId}
          commentId={open}
          placeholder="Write an answer..."
          onClose={() => setOpen(null)}
          onReadChange={(id, read) => setRows((list) => (list ?? []).map((q) => (q.id === id ? { ...q, isRead: read } : q)))}
          onReplied={(id, replies) => setRows((list) => (list ?? []).map((q) => (q.id === id ? { ...q, replies } : q)))}
        />
      )}
    </div>
  );
}
