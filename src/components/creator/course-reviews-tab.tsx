"use client";

import { useEffect, useState } from "react";
import { MdStar } from "react-icons/md";
import { EmptyIllustration } from "@/components/creator/course-report-tab";

interface Review {
  id: string;
  userName: string;
  phone: string;
  rating: number;
  createdAt: string | null;
}

const COLS = "grid-cols-[minmax(200px,1fr)_minmax(180px,1fr)_minmax(260px,2fr)_minmax(220px,1fr)]";

/** "11 Jun 2026, 11:52 AM" */
function fmtDateTime(iso: string | null) {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return "-";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

/** What students rated the course. */
export function CourseReviewsTab({ courseId }: { courseId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/courses/${courseId}/reviews`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { reviews: Review[] }) => {
        if (!cancelled) setReviews(data.reviews);
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
      <div className="px-5 pb-6 pt-5">
        <h2 className="text-[27px] font-semibold text-black">Reviews</h2>
        <p className="mt-1 text-[17px] text-gray-700">List of all the reviews by the students</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className={`grid ${COLS} items-center border-y border-gray-200 text-lg text-black`}>
            <div className="px-5 py-5">User</div>
            <div className="border-l border-gray-200 px-5 py-5">Phone</div>
            <div className="border-l border-gray-200 px-5 py-5">Review</div>
            <div className="border-l border-gray-200 px-5 py-5">Date of Review</div>
          </div>

          {(reviews ?? []).map((r) => (
            <div key={r.id} className={`grid ${COLS} items-center border-b border-gray-200 text-lg text-black last:border-b-0`}>
              <div className="flex min-w-0 items-center gap-3 px-5 py-5">
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#4a4a5a] text-base text-white">
                  {r.userName.charAt(0).toUpperCase()}
                </span>
                <span className="truncate text-gray-800">{r.userName}</span>
              </div>
              <div className="px-5 py-5">{r.phone || "-"}</div>
              <div className="flex gap-1.5 px-5 py-4" aria-label={`${r.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <MdStar key={n} className={`h-7 w-7 ${n <= r.rating ? "text-[#ffd400]" : "text-gray-300"}`} />
                ))}
              </div>
              <div className="px-5 py-5 text-base text-gray-800">{fmtDateTime(r.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>

      {failed ? (
        <p className="py-16 text-center text-base text-gray-600">Could not load the reviews. Please refresh and try again.</p>
      ) : !reviews ? (
        <div className="flex justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center px-4 pb-20 pt-14">
          <EmptyIllustration />
          <p className="mt-6 text-lg text-gray-600">Reviews your students leave on this course will appear here</p>
        </div>
      ) : null}
    </div>
  );
}
