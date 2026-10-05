"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, Plus, Search, MoreHorizontal, X } from "lucide-react";
import toast from "react-hot-toast";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  published: boolean;
  creatorName: string;
  _count: { sections: number; lectures: number };
}

interface ServiceOption {
  id: string;
  title: string;
  slug: string;
  course_id: string | null;
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  useEffect(() => { fetchCourses(); fetchServices(); }, []);

  async function fetchCourses() {
    const res = await fetch("/api/courses");
    const data = await res.json();
    setCourses(data);
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
  }

  function findServiceForCourse(courseId: string): ServiceOption | undefined {
    return services.find((s) => {
      if (!s.course_id) return false;
      return s.course_id.split(",").map((c) => c.trim()).includes(String(courseId));
    });
  }

  function openCreateModal() {
    setShowCreate(true);
    setNewTitle("");
    setSelectedServiceIds(new Set());
    setServiceSearch("");
    fetchServices();
  }

  async function createCourse() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const course = await res.json();

      if (selectedServiceIds.size > 0) {
        for (const sid of selectedServiceIds) {
          const svcRes = await fetch(`/api/services/${sid}`);
          const svc = svcRes.ok ? await svcRes.json() : null;
          const existing = svc?.course_id ? String(svc.course_id).split(",").filter(Boolean).map((s: string) => s.trim()) : [];
          if (!existing.includes(String(course.id))) {
            existing.push(String(course.id));
          }
          await fetch(`/api/services/${sid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ course_id: existing.join(",") }),
          });
        }
      }

      toast.success("Course created!");
      setShowCreate(false);
      setNewTitle("");
      router.push(`/creator/courses/${course.id}`);
    } catch {
      toast.error("Failed to create course");
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

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredServices = services.filter(
    (s) => s.title.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first course to start teaching."
          actionLabel="Create Course"
          onAction={openCreateModal}
        />
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="search by course title or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <select className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none">
              <option>Course</option>
            </select>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <div key={course.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-900 flex items-center justify-center">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="h-12 w-12 text-gray-600" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-end mb-1">
                    {course.published ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-green-600 px-2 py-0.5 rounded">
                        Published
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug">{course.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{course.creatorName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {course._count.sections} sections &middot; {course._count.lectures} lectures
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => router.push(`/creator/courses/${course.id}`)}
                      className="flex-1 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Edit course
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === course.id ? null : course.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuOpen === course.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-2">
                            <button
                              onClick={() => {
                                setMenuOpen(null);
                                const svc = findServiceForCourse(course.id);
                                if (svc) {
                                  router.push(`/checkout/${svc.slug}`);
                                } else {
                                  toast.error("No service linked to this course");
                                }
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              View as customer
                            </button>
                            <button
                              onClick={() => { setMenuOpen(null); router.push(`/creator/courses/${course.id}`); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              Course overview
                            </button>
                            <button
                              onClick={() => { setMenuOpen(null); toast("Clone coming soon"); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              Clone course
                            </button>
                            <button
                              onClick={() => togglePublish(course)}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              {course.published ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              onClick={() => deleteCourse(course)}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create new course">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-5">
            <BookOpen className="h-7 w-7 text-gray-800" />
          </div>
          <h3 className="text-base font-bold text-gray-900">How about a working title?</h3>
          <p className="text-sm text-gray-400 mt-1 text-center leading-relaxed mb-6">
            {"It's ok if you can't think of a good title now. You can"}<br />{"change it later."}
          </p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); createCourse(); }}
          className="space-y-0"
        >
          <div className="relative border-b border-gray-200 py-1">
            <input
              type="text"
              placeholder="e.g. Learn Aquascaping from Scratch"
              value={newTitle}
              onChange={(e) => { if (e.target.value.length <= 100) setNewTitle(e.target.value); }}
              maxLength={100}
              required
              className="w-full px-1 py-2.5 text-sm focus:outline-none pr-10 bg-transparent placeholder:text-gray-400"
            />
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {100 - newTitle.length}
            </span>
          </div>

          {/* Link services */}
          <div className="relative border-b border-gray-200 py-1">
            <div
              className="w-full px-1 py-2.5 text-sm cursor-pointer flex items-center gap-2 flex-wrap min-h-[42px]"
              onClick={() => setShowServiceDropdown(!showServiceDropdown)}
            >
              {selectedServiceIds.size === 0 ? (
                <span className="text-gray-400">Link services to this course</span>
              ) : (
                <>
                  {Array.from(selectedServiceIds).map((sid) => {
                    const svc = services.find((s) => s.id === sid);
                    return svc ? (
                      <span key={sid} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                        {svc.title}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleService(sid); }}
                          className="cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </>
              )}
            </div>

            {showServiceDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                    onClick={(e) => e.stopPropagation()}
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
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between ${
                        selectedServiceIds.has(svc.id) ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700"
                      }`}
                    >
                      <span>{svc.title}</span>
                      {selectedServiceIds.has(svc.id) && (
                        <span className="text-gray-500 text-xs">&#10003;</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="pt-5">
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer"
            >
              {creating ? "Creating..." : "Continue"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
