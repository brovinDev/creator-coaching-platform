"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  ArrowLeft,
  Copy,
  Link2,
  Pencil,
  MoreHorizontal,
  Users,
  ShoppingCart,
  BookOpen,
  Search,
  RefreshCw,
  Check,
  EyeOff,
  Eye,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image: string | null;
  service_type: string;
  status: string;
  currency: string;
  price: number;
  discounted_price: number | null;
  start_date: string | null;
  published: boolean;
  active_users: number;
  created_at: string;
  course_id: string;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  published: boolean;
  _count: { enrollments: number; modules: number };
}

type Tab = "courses";

function StatCard({
  label,
  value,
  prefix,
}: {
  label: string;
  value: string | number;
  prefix?: string;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">
        {prefix}
        {value}
      </p>
    </div>
  );
}

export default function ServiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.serviceId as string;
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("courses");
  const [linkedCourses, setLinkedCourses] = useState<Course[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [showManage, setShowManage] = useState(false);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [manageSearch, setManageSearch] = useState("");
  const [savingCourses, setSavingCourses] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [morePos, setMorePos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    loadService();
  }, [serviceId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node) &&
        moreBtnRef.current && !moreBtnRef.current.contains(e.target as Node)
      ) setMoreOpen(false);
    }
    if (moreOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  async function handleToggleVisibility() {
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !service?.published }),
      });
      if (!res.ok) throw new Error();
      toast.success(service?.published ? "Service hidden" : "Service published");
      loadService();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const res = await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Service deleted");
      router.push("/creator/services");
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function loadService() {
    try {
      const res = await fetch(`/api/services/${serviceId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setService(data);

      const courseIdsStr = data.course_id || "";
      const ids = courseIdsStr ? courseIdsStr.split(",").filter(Boolean) : [];

      if (ids.length > 0) {
        const coursePromises = ids.map((id: string) =>
          fetch(`/api/courses/${id.trim()}`).then((r) => (r.ok ? r.json() : null))
        );
        const courses = (await Promise.all(coursePromises)).filter(Boolean);
        setLinkedCourses(courses);
      } else {
        setLinkedCourses([]);
      }
    } catch {
      toast.error("Service not found");
      router.push("/creator/services");
    } finally {
      setLoading(false);
    }
  }

  async function openManageModal() {
    try {
      const res = await fetch("/api/courses");
      if (res.ok) {
        const data = await res.json();
        setAllCourses(data);
      }
    } catch {
      toast.error("Failed to load courses");
    }
    setSelectedCourseIds(new Set(linkedCourses.map((c) => c.id)));
    setManageSearch("");
    setShowManage(true);
  }

  function toggleCourse(id: string) {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveCourseLinks() {
    setSavingCourses(true);
    try {
      const ids = Array.from(selectedCourseIds).join(",");
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: ids }),
      });
      if (!res.ok) throw new Error();
      toast.success("Courses updated!");
      setShowManage(false);
      loadService();
    } catch {
      toast.error("Failed to save courses");
    } finally {
      setSavingCourses(false);
    }
  }

  if (loading || !service) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading...
      </div>
    );
  }

  const checkoutUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/checkout/${service.slug}`;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  }

  const filteredLinked = linkedCourses.filter((c) =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const filteredManageCourses = allCourses.filter((c) =>
    c.title.toLowerCase().includes(manageSearch.toLowerCase())
  );

  return (
    <div>
      <Link
        href="/creator/services"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Services
      </Link>

      <div className="flex gap-8">
        {/* Left column — Service info */}
        <div className="w-[340px] shrink-0">
          <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-square mb-4">
            {service.cover_image ? (
              <img
                src={service.cover_image}
                alt={service.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <ShoppingCart className="h-16 w-16" />
              </div>
            )}
            {service.published && (
              <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white">
                ACTIVE
              </span>
            )}
            {!service.published && (
              <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold bg-gray-500 text-white">
                DRAFT
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-3">
            {service.title}
          </h1>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md">
              Service ID: {service.id}
            </span>
            <button
              onClick={() => copyToClipboard(service.id, "Service ID")}
              className="text-gray-400 hover:text-gray-600"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl font-bold text-indigo-600">
              {service.service_type === "free"
                ? "Free"
                : `₹${service.price.toLocaleString("en-IN")}`}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-600 text-white uppercase">
              {service.service_type}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-5">
            <Link2 className="h-4 w-4 text-indigo-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Service checkout link</p>
              <p className="text-xs text-indigo-600 truncate">{checkoutUrl}</p>
            </div>
            <button
              onClick={() => copyToClipboard(checkoutUrl, "Checkout link")}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 relative">
            <Button
              onClick={() =>
                router.push(`/creator/services/${service.id}/edit`)
              }
              className="flex-1"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                toast.success("Clone feature coming soon");
              }}
              className="flex-1"
            >
              Clone
            </Button>
            <Button
              ref={moreBtnRef}
              variant="outline"
              className="px-2.5"
              onClick={() => {
                if (!moreOpen && moreBtnRef.current) {
                  const rect = moreBtnRef.current.getBoundingClientRect();
                  setMorePos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                }
                setMoreOpen(!moreOpen);
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {moreOpen && (
              <div
                ref={moreMenuRef}
                className="fixed w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]"
                style={{ top: morePos.top, right: morePos.right }}
              >
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    handleToggleVisibility();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
                >
                  {service.published ? <EyeOff className="h-4 w-4 shrink-0" /> : <Eye className="h-4 w-4 shrink-0" />}
                  {service.published ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    copyToClipboard(checkoutUrl, "Payment success page link");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
                >
                  <Link2 className="h-4 w-4 shrink-0" />
                  Copy payment success page link
                </button>
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    handleDelete();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column — Statistics + Tabs */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Statistics</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Total Customers"
              value={service.active_users}
            />
            <StatCard
              label="Total Sales"
              value={service.active_users}
            />
            <StatCard
              label="Total Earnings"
              value={(service.active_users * service.price).toLocaleString("en-IN")}
              prefix="₹ "
            />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Refund</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="No. of Refunds" value={0} />
                <StatCard label="Total Refund Value" value={0} prefix="₹ " />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Referrals</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="No. of Referrals" value={0} />
                <StatCard
                  label="Earnings from Affiliates"
                  value={0}
                  prefix="₹ "
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex gap-6">
              {(
                [
                  { key: "courses", label: "Courses", icon: BookOpen },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === tab.key
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content — Courses */}
          {activeTab === "courses" && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={loadService}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 text-gray-500" />
                </button>
                <Button onClick={openManageModal}>
                  Manage
                </Button>
              </div>

              {filteredLinked.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No courses linked to this service yet.</p>
                  <p className="text-xs mt-1">
                    Click &quot;Manage&quot; to add courses.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredLinked.map((course) => (
                    <div
                      key={course.id}
                      className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/creator/courses/${course.id}`)}
                    >
                      <div className="relative aspect-video bg-gray-900">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <BookOpen className="h-10 w-10" />
                          </div>
                        )}
                        <span
                          className={`absolute bottom-2 right-2 px-2.5 py-0.5 rounded text-[10px] font-bold text-white ${
                            course.published ? "bg-green-600" : "bg-gray-500"
                          }`}
                        >
                          {course.published ? "PUBLISHED" : "DRAFT"}
                        </span>
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
                          {course.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {course._count?.modules || 0} sections
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manage courses modal */}
      <Modal
        open={showManage}
        onClose={() => setShowManage(false)}
        title="Manage courses"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 -mt-2 mb-4">
              Which courses do you want to add?
              Select courses from the list below to add them to this service
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search course by name"
                value={manageSearch}
                onChange={(e) => setManageSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredManageCourses.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">
                No courses found
              </p>
            ) : (
              filteredManageCourses.map((course) => {
                const isSelected = selectedCourseIds.has(course.id);
                return (
                  <button
                    key={course.id}
                    onClick={() => toggleCourse(course.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      isSelected
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {course.title}
                        </span>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                            course.published ? "bg-green-600" : "bg-gray-500"
                          }`}
                        >
                          {course.published ? "PUBLISHED" : "DRAFT"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {service.title}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-gray-900 border-gray-900"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveCourseLinks} loading={savingCourses}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
