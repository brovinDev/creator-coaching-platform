"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ReorderCoursesPanel } from "@/components/creator/reorder-courses-panel";
import { useProductName } from "@/components/product-name";
import { BookOpen, Check, ChevronDown, ListFilter, MoreHorizontal, Plus, Search, X } from "lucide-react";
import toast from "react-hot-toast";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  published: boolean;
  creatorName: string;
  services: string[];
  _count: { sections: number; lectures: number };
}

interface ServiceOption {
  id: string;
  title: string;
  slug: string;
  course_id: string | null;
}

type Status = "all" | "published" | "draft";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const { one, One } = useProductName();
  const [reordering, setReordering] = useState(false);
  const [servicesReady, setServicesReady] = useState(false);
  const [noService, setNoService] = useState(false);
  const [unreadComments, setUnreadComments] = useState(0);

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  useEffect(() => { fetchCourses(); fetchServices(); }, []);

  // The unread count beside "Comments".
  useEffect(() => {
    fetch("/api/courses/comments?summary=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && typeof d.unread === "number") setUnreadComments(d.unread); })
      .catch(() => {});
  }, []);

  async function fetchCourses() {
    const res = await fetch("/api/courses");
    const data = await res.json();
    setCourses(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function fetchServices() {
    const res = await fetch("/api/services");
    if (res.ok) {
      const data = await res.json();
      setServices(data.map((s: Record<string, unknown>) => ({
        id: String(s.id),
        title: String(s.title || ""),
        slug: String(s.slug || ""),
        course_id: s.course_id ? String(s.course_id) : null,
      })));
    }
    setServicesReady(true);
  }

  function openCreateModal() {
    // A course is sold through a service, so with none yet the first step is to make one.
    if (servicesReady && services.length === 0) {
      setNoService(true);
      return;
    }
    setShowCreate(true);
    setNewTitle("");
    setSelectedServiceIds(new Set());
    setServiceSearch("");
    setShowServiceDropdown(false);
    fetchServices();
  }

  async function createCourse() {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const course = await res.json();
      if (!res.ok) throw new Error(course.error || "Failed to create course");

      for (const sid of selectedServiceIds) {
        const svcRes = await fetch(`/api/services/${sid}`);
        const svc = svcRes.ok ? await svcRes.json() : null;
        const existing = svc?.course_id ? String(svc.course_id).split(",").filter(Boolean).map((s: string) => s.trim()) : [];
        if (!existing.includes(String(course.id))) existing.push(String(course.id));
        await fetch(`/api/services/${sid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_id: existing.join(",") }),
        });
      }

      toast.success("Course created!");
      setShowCreate(false);
      setNewTitle("");
      router.push(`/creator/courses/${course.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setCreating(false);
    }
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setShowServiceDropdown(false);
    setServiceSearch("");
  }

  async function togglePublish(course: Course) {
    setMenuOpen(null);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !course.published }),
      });
      if (res.ok) {
        toast.success(course.published ? "Course unpublished" : "Course published");
        fetchCourses();
      } else {
        toast.error("Failed to update course");
      }
    } catch {
      toast.error("Failed to update course");
    }
  }

  async function deleteCourse(course: Course) {
    setMenuOpen(null);
    if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Course deleted");
        fetchCourses();
      } else {
        toast.error("Failed to delete course");
      }
    } catch {
      toast.error("Failed to delete course");
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = courses.filter(
    (c) =>
      (status === "all" || (status === "published") === c.published) &&
      (!q || c.title.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q))
  );

  const filteredServices = services.filter((s) => s.title.toLowerCase().includes(serviceSearch.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-[1280px]" style={{ zoom: 0.8, fontFamily: "var(--font-poppins), sans-serif" }}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[32px] font-semibold leading-tight text-black">Courses</h1>
        <div className="flex items-center gap-5">
          <Link href="/creator/courses/comments" className="text-lg font-semibold text-[#1d86ff] hover:underline">
            Comments{unreadComments > 0 ? ` (${unreadComments})` : ""}
          </Link>
          {courses.length > 1 && (
            <button
              onClick={() => setReordering(true)}
              className="h-11 cursor-pointer rounded-md bg-indigo-600 px-5 text-[15px] font-semibold text-white hover:bg-indigo-700"
            >
              Reorder courses
            </button>
          )}
        <button
          onClick={openCreateModal}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-md bg-indigo-600 px-5 text-[15px] font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            placeholder="search by course title or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-md border border-gray-200 bg-white pl-12 pr-4 text-[15px] text-gray-900 placeholder:text-gray-500 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div className="relative w-[195px]">
          <select
            className="h-11 w-full cursor-pointer appearance-none rounded-md border border-gray-200 bg-white px-4 pr-9 text-[15px] text-gray-800 focus:border-gray-400 focus:outline-none"
            value="course"
            onChange={() => {}}
          >
            <option value="course">Course</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
        </div>
        <div className="relative">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            aria-label="Filter"
            className={`flex h-11 w-16 cursor-pointer items-center justify-center rounded-md hover:bg-gray-300 ${status === "all" ? "bg-gray-200" : "bg-gray-300"}`}
          >
            <ListFilter className="h-5 w-5 text-black" />
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg">
                {(["all", "published", "draft"] as Status[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatus(s); setFilterOpen(false); }}
                    className={`block w-full cursor-pointer px-4 py-2 text-left text-sm capitalize hover:bg-gray-50 ${status === s ? "font-semibold text-black" : "text-gray-700"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <BookOpen className="h-7 w-7 text-black" />
          </div>
          <h2 className="text-lg font-semibold text-black">No courses yet</h2>
          <p className="mt-1 text-sm text-gray-500">Create your first course to start teaching.</p>
          <button
            onClick={openCreateModal}
            className="mt-5 flex h-11 cursor-pointer items-center gap-2 rounded-md bg-indigo-600 px-5 text-[15px] font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create course
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">No courses match your search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <div
              key={course.id}
              onClick={() => router.push(`/creator/courses/${course.id}`)}
              className="flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-lg bg-black">
                {course.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-12 w-12 text-gray-600" />
                )}
              </div>
              <div className="mt-2 flex h-6 justify-end">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase leading-5 ${
                    course.published ? "bg-green-600 text-white" : "bg-[#e6e7ee] text-[#4a4a5a]"
                  }`}
                >
                  {course.published ? "Published" : "Draft"}
                </span>
              </div>
              <h3 className="mt-1 line-clamp-2 min-h-[56px] text-xl font-semibold leading-7 text-black">{course.title}</h3>
              <p className="mt-2 text-base text-gray-900">{course.creatorName}</p>
              <p className="mt-1 text-[13px] text-gray-700">
                {course._count.sections} sections &bull; {course._count.lectures} lectures
              </p>
              <div className="mt-auto flex items-center gap-2 pt-4" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => router.push(`/creator/courses/${course.id}`)}
                  className="h-10 flex-1 cursor-pointer rounded-md bg-gray-200 text-[15px] font-semibold text-gray-900 hover:bg-gray-300"
                >
                  Edit course
                </button>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === course.id ? null : course.id)}
                    aria-label="More"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {menuOpen === course.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                      <div className="absolute bottom-full right-0 z-20 mb-1 w-48 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                        <button
                          onClick={() => { setMenuOpen(null); router.push(`/preview/courses/${course.id}`); }}
                          className="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          View as customer
                        </button>
                        <button
                          onClick={() => { setMenuOpen(null); router.push(`/creator/courses/${course.id}`); }}
                          className="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Course overview
                        </button>
                        <button
                          onClick={() => togglePublish(course)}
                          className="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {course.published ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={() => deleteCourse(course)}
                          className="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {noService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setNoService(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setNoService(false); }}
        >
          <div className="w-full max-w-[650px] rounded-xl bg-white px-10 pb-12 pt-11 text-center shadow-xl">
            <span className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-green-600">
              <Check className="h-10 w-10 text-white" strokeWidth={3.5} />
            </span>
            <h2 className="mt-5 text-[26px] font-semibold text-black">
              No {One} - No Course <span aria-hidden>&#128579;</span>
            </h2>
            <p className="mx-auto mt-2 max-w-[560px] text-lg leading-7 text-gray-700">
              Create your first {one} to start hosting courses, live workshops and sessions with your audience!
            </p>
            <button
              onClick={() => router.push("/creator/services/new")}
              autoFocus
              className="mt-10 h-[47px] cursor-pointer rounded-full bg-indigo-600 px-8 text-lg font-semibold text-white hover:bg-indigo-700"
            >
              Create a {one}
            </button>
          </div>
        </div>
      )}

      {reordering && (
        <ReorderCoursesPanel
          courses={courses.map((c) => ({ id: c.id, title: c.title, published: c.published, services: c.services || [] }))}
          onClose={() => setReordering(false)}
          onSaved={fetchCourses}
        />
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-16"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="relative w-full max-w-[650px] rounded-xl bg-white px-5 pb-5 pt-5 shadow-xl">
            <h2 className="text-center text-xl font-semibold text-black">Create new course</h2>
            <button
              onClick={() => setShowCreate(false)}
              aria-label="Close"
              className="absolute right-5 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <X className="h-5 w-5 text-black" />
            </button>

            <div className="mt-12 flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200">
                <BookOpen className="h-9 w-9 fill-black text-black" />
              </div>
              <h3 className="mt-8 text-2xl font-semibold text-black">How about a working title?</h3>
              <p className="mt-3 max-w-[460px] text-center text-base leading-7 text-gray-700">
                It&rsquo;s ok if you can&rsquo;t think of a good title now. You can change it later.
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createCourse(); }} className="mt-10">
              <div className="relative flex h-[68px] items-center rounded-lg border border-gray-200">
                <input
                  type="text"
                  placeholder="e.g. Learn Aquascaping from Scratch"
                  value={newTitle}
                  onChange={(e) => { if (e.target.value.length <= 100) setNewTitle(e.target.value); }}
                  maxLength={100}
                  autoFocus
                  className="h-full w-full rounded-lg bg-transparent pl-5 pr-16 text-lg text-gray-900 placeholder:text-gray-500 focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded bg-gray-100 px-2 py-1 text-sm font-semibold text-black">
                  {100 - newTitle.length}
                </span>
              </div>

              <div className="relative mt-5">
                <div
                  className="flex min-h-[66px] cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-4 py-3"
                  onClick={() => setShowServiceDropdown((v) => !v)}
                >
                  {selectedServiceIds.size === 0 ? (
                    <span className="text-base text-gray-600">Link services to this course</span>
                  ) : (
                    Array.from(selectedServiceIds).map((sid) => {
                      const svc = services.find((s) => s.id === sid);
                      return svc ? (
                        <span key={sid} className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-800">
                          {svc.title}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleService(sid); }}
                            className="cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : null;
                    })
                  )}
                </div>

                {showServiceDropdown && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="border-b border-gray-100 p-2">
                      <input
                        type="text"
                        placeholder="Search services..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                      />
                    </div>
                    {filteredServices.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">No services found</div>
                    ) : (
                      filteredServices.map((svc) => (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleService(svc.id); }}
                          className={`flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
                            selectedServiceIds.has(svc.id) ? "bg-gray-100 font-medium text-gray-900" : "text-gray-700"
                          }`}
                        >
                          <span>{svc.title}</span>
                          {selectedServiceIds.has(svc.id) && <span className="text-xs text-gray-500">&#10003;</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="mt-14 h-[54px] w-full cursor-pointer rounded-md bg-indigo-600 text-lg font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating ? "Creating..." : "Continue"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
