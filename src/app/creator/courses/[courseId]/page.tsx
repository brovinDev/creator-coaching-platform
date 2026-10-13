"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Upload,
  Loader2,
  GripVertical,
  Info as InfoIcon,
} from "lucide-react";
import {
  MdAddBox,
  MdArticle,
  MdTimer,
  MdInsertChart,
  MdChat,
  MdHelp,
  MdAssignment,
  MdFactCheck,
  MdSmartToy,
  MdPlayArrow,
  MdHeadset,
  MdImage,
  MdQuestionAnswer,
  MdLink,
  MdEditNote,
  MdInsertDriveFile,
  MdPlayCircle,
} from "react-icons/md";
import toast from "react-hot-toast";
import { RichTextEditor } from "@/components/rich-text-editor";
import { CourseInfoTab, type CourseInfo } from "@/components/creator/course-info-tab";
import { CourseDripTab, type DripType } from "@/components/creator/course-drip-tab";
import { CourseReportTab } from "@/components/creator/course-report-tab";
import { CourseCommentsTab } from "@/components/creator/course-comments-tab";
import { CourseQnaTab } from "@/components/creator/course-qna-tab";
import { CourseAssignmentsTab } from "@/components/creator/course-assignments-tab";
import { CourseReviewsTab } from "@/components/creator/course-reviews-tab";
import { VideoDialog } from "@/components/creator/video-dialog";

interface Resource {
  name: string;
  url: string;
  type: string;
}

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  position: number;
  resources: string | null;
  isFree?: boolean;
  videoName?: string;
  videoSize?: string;
}

interface Module {
  id: string;
  title: string;
  position: number;
  dripDays?: string;
  dripDate?: string;
  lessons: Lesson[];
}

interface Course extends CourseInfo {
  slug: string;
  dripType?: string;
  published: boolean;
  modules: Module[];
  _count: { enrollments: number };
}

type SidebarTab = "curriculum" | "information" | "drip" | "report" | "comments" | "qna" | "assignments" | "reviews";
type VideoMode = "upload" | "url";

/** Characters the editor stores HTML-escaped inside pasted links (a Vimeo embed URL arrives with &amp;). */
const decodeUrl = (url: string) => url.replace(/&amp;/g, "&");
/** "sample-5s.mp4" from the end of an upload address, for videos saved before the name was kept. */
const fileNameFrom = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "Video");
  } catch {
    return "Video";
  }
};
const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const isFileUrl = (url: string) => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || /res\.cloudinary\.com/.test(url);

const SIDEBAR: { key: string; label: string; icon: React.ComponentType<{ className?: string }>; group: 1 | 2 }[] = [
  { key: "curriculum", label: "Curriculum", icon: MdAddBox, group: 1 },
  { key: "information", label: "Information", icon: MdArticle, group: 1 },
  { key: "drip", label: "Drip", icon: MdTimer, group: 1 },
  { key: "report", label: "Report", icon: MdInsertChart, group: 2 },
  { key: "comments", label: "Comments", icon: MdChat, group: 2 },
  { key: "qna", label: "QnA", icon: MdHelp, group: 2 },
  { key: "assignments", label: "Assignment Responses", icon: MdAssignment, group: 2 },
  { key: "reviews", label: "Reviews", icon: MdFactCheck, group: 2 },
  { key: "chatbot", label: "QnA Chatbot", icon: MdSmartToy, group: 2 },
];

/** The dark pill with an arrow that shows under a content-type icon on hover or focus. */
function Tip({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#222] px-4 py-3 text-sm font-medium text-white group-hover:block group-focus-visible:block">
      <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-[#222]" />
      <span className="relative">{text}</span>
    </span>
  );
}

/** A document tile with a folded corner, as the content-type picker shows; the glyph sits on top. */
function FileTile({
  color,
  children,
  onClick,
  title,
  outlined,
}: {
  color: string;
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  outlined?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      onClick={onClick}
      className="group relative h-14 w-11 shrink-0 cursor-pointer"
    >
      <svg viewBox="0 0 44 56" className="absolute inset-0 h-full w-full" aria-hidden>
        <path
          d="M6 .5h24.5L43.5 14v36a5.5 5.5 0 0 1-5.5 5.5H6A5.5 5.5 0 0 1 .5 50V6A5.5 5.5 0 0 1 6 .5Z"
          fill={color}
          stroke={outlined ? "#e5e7eb" : "none"}
        />
        <path d="M30.5.5V8a6 6 0 0 0 6 6h7Z" fill={outlined ? "#f3f4f6" : "#fff"} fillOpacity={outlined ? 1 : 0.38} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center pt-2">{children}</span>
      <Tip text={title} />
    </button>
  );
}

/** The solid triangle beside a chapter: points right when closed, down when open. */
function Caret({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-block h-0 w-0 shrink-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-black transition-transform ${open ? "rotate-90" : ""}`}
    />
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-[52px] shrink-0 cursor-pointer rounded-full border-2 transition-colors ${
        on ? "border-indigo-600 bg-indigo-600" : "border-gray-400 bg-gray-100"
      }`}
    >
      <span
        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all ${
          on ? "left-[30px] bg-white" : "left-[3px] bg-gray-400"
        }`}
      />
    </button>
  );
}

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>("curriculum");
  const [logoUrl, setLogoUrl] = useState("");

  // Section (module) state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");

  // Chapter (lesson) state
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [pickerClosed, setPickerClosed] = useState<Set<string>>(new Set());
  const [editingChapter, setEditingChapter] = useState<{ moduleId: string; lessonId: string; title: string; isFree: boolean } | null>(null);
  const [addingChapter, setAddingChapter] = useState<{ moduleId: string; title: string; isFree: boolean } | null>(null);
  const [savingChapter, setSavingChapter] = useState(false);

  // Upload/edit state
  const [showVideoModal, setShowVideoModal] = useState<{ moduleId: string; lessonId: string; mode: VideoMode } | null>(null);
  const [editingDescription, setEditingDescription] = useState<{ moduleId: string; lessonId: string; content: string } | null>(null);

  // Resource upload state
  const [uploadingResource, setUploadingResource] = useState<string | null>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const resourceTargetRef = useRef<{ moduleId: string; lessonId: string } | null>(null);

  // Drag-and-drop reorder state
  const dragItemRef = useRef<{ moduleId: string; lessonIdx: number } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ moduleId: string; lessonIdx: number } | null>(null);
  const [draggingLesson, setDraggingLesson] = useState<string | null>(null);

  useEffect(() => { fetchCourse(); }, [courseId]);

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => { if (b?.logoUrl) setLogoUrl(b.logoUrl); })
      .catch(() => {});
  }, []);

  async function fetchCourse() {
    const res = await fetch(`/api/courses/${courseId}`);
    if (!res.ok) { router.push("/creator/courses"); return; }
    const data = await res.json();
    setCourse(data);
    setLoading(false);
  }

  async function togglePublish() {
    if (!course?.published) {
      // TagMango marks these as required before a course can go live.
      const plain = (course?.description || "").replace(/<[^>]*>/g, "").trim();
      if (!plain || !course?.thumbnail) {
        toast.error("Add a description and a cover image in the Information tab first");
        setActiveTab("information");
        return;
      }
    }
    await fetch(`/api/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !course?.published }),
    });
    toast.success(course?.published ? "Course unpublished" : "Course published!");
    fetchCourse();
  }

  // Section CRUD
  async function addSection() {
    await fetch(`/api/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Section" }),
    });
    fetchCourse();
  }

  async function saveSectionTitle(moduleId: string) {
    if (!editingSectionTitle.trim()) return;
    await fetch(`/api/courses/${courseId}/modules/${moduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingSectionTitle }),
    });
    setEditingSectionId(null);
    fetchCourse();
  }

  async function deleteSection(moduleId: string) {
    if (!confirm("Delete this section and all its chapters?")) return;
    await fetch(`/api/courses/${courseId}/modules/${moduleId}`, { method: "DELETE" });
    toast.success("Section deleted");
    fetchCourse();
  }

  // Chapter CRUD
  async function addChapter() {
    if (!addingChapter || !addingChapter.title.trim() || savingChapter) return;
    setSavingChapter(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/modules/${addingChapter.moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: addingChapter.title.trim(), isFree: addingChapter.isFree }),
      });
      if (!res.ok) throw new Error();
      const lesson = await res.json();
      setAddingChapter(null);
      // Open the new chapter so the content picker is right there.
      setExpandedChapters((prev) => new Set(prev).add(String(lesson.id)));
      await fetchCourse();
    } catch {
      toast.error("Could not add the chapter");
    } finally {
      setSavingChapter(false);
    }
  }

  async function saveChapterEdit() {
    if (!editingChapter || !editingChapter.title.trim() || savingChapter) return;
    setSavingChapter(true);
    try {
      await updateChapter(editingChapter.moduleId, editingChapter.lessonId, {
        title: editingChapter.title.trim(),
        isFree: editingChapter.isFree,
      });
      setEditingChapter(null);
    } finally {
      setSavingChapter(false);
    }
  }

  async function deleteChapter(moduleId: string, lessonId: string) {
    if (!confirm("Delete this chapter?")) return;
    await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { method: "DELETE" });
    toast.success("Chapter deleted");
    fetchCourse();
  }

  async function updateChapter(moduleId: string, lessonId: string, data: Record<string, unknown>) {
    await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await fetchCourse();
  }

  async function saveDescription() {
    if (!editingDescription) return;
    await updateChapter(editingDescription.moduleId, editingDescription.lessonId, { content: editingDescription.content });
    toast.success("Description saved");
    setEditingDescription(null);
  }

  function parseResources(lesson: Lesson): Resource[] {
    if (!lesson.resources) return [];
    try { return JSON.parse(lesson.resources); } catch { return []; }
  }

  async function handleResourceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !resourceTargetRef.current) return;
    const { moduleId, lessonId } = resourceTargetRef.current;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large. Max 25MB.");
      return;
    }

    setUploadingResource(lessonId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
      const lesson = course?.modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
      const existing = lesson ? parseResources(lesson) : [];
      existing.push({ name: file.name, url, type: ext });

      await updateChapter(moduleId, lessonId, { resources: JSON.stringify(existing) });
      toast.success("Resource uploaded");
    } catch {
      toast.error("Failed to upload resource");
    } finally {
      setUploadingResource(null);
      if (resourceInputRef.current) resourceInputRef.current.value = "";
    }
  }

  async function deleteResource(moduleId: string, lessonId: string, index: number) {
    const lesson = course?.modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const resources = parseResources(lesson);
    resources.splice(index, 1);
    await updateChapter(moduleId, lessonId, { resources: JSON.stringify(resources) });
    toast.success("Resource removed");
  }

  async function reorderChapters(moduleId: string, fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx || !course) return;
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const lessons = [...mod.lessons];
    const [moved] = lessons.splice(fromIdx, 1);
    lessons.splice(toIdx, 0, moved);

    setCourse({
      ...course,
      modules: course.modules.map((m) => (m.id === moduleId ? { ...m, lessons } : m)),
    });

    await Promise.all(
      lessons.map((lesson, idx) =>
        fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: idx }),
        })
      )
    );
  }

  function toggleChapter(id: string) {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (loading || !course) {
    return <div className="fixed inset-0 z-40 flex items-center justify-center bg-white text-gray-400">Loading...</div>;
  }

  const sidebarLink = (key: string) => {
    if (key === "curriculum" || key === "information" || key === "drip" || key === "report" || key === "comments" || key === "qna" || key === "assignments" || key === "reviews") setActiveTab(key);
    else toast("Coming soon");
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white font-sans" style={{ zoom: 0.8, fontFamily: "var(--font-poppins), sans-serif" }}>
      {/* Top bar */}
      <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/creator/courses")}
            aria-label="Back to courses"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-gray-300 hover:bg-gray-400"
          >
            <ArrowLeft className="h-6 w-6 text-black" />
          </button>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-14 w-14 rounded object-cover" />
          )}
          <span className="hidden h-8 w-px bg-gray-200 sm:block" />
          <h1 className="max-w-[520px] truncate text-lg font-semibold text-gray-900">{course.title}</h1>
        </div>
        <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/preview/courses/${courseId}`)}
          className="h-[52px] cursor-pointer rounded-md bg-indigo-600 px-[29px] text-lg font-semibold text-white hover:bg-indigo-700"
        >
          Preview changes
        </button>
        {!course.published && (
          <button
            onClick={togglePublish}
            className="h-12 cursor-pointer rounded-md bg-indigo-600 px-[29px] text-lg font-semibold text-white hover:bg-indigo-700"
          >
            Publish
          </button>
        )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-[450px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white px-4 pt-4 md:block">
          <nav>
            {SIDEBAR.map((item, i) => {
              const active = item.key === activeTab;
              const Icon = item.icon;
              return (
                <div key={item.key}>
                  {item.group === 2 && SIDEBAR[i - 1]?.group === 1 && <div className="my-3 border-t border-gray-200" />}
                  <button
                    onClick={() => sidebarLink(item.key)}
                    className={`flex h-[75px] w-full cursor-pointer items-center justify-between rounded-lg px-4 text-left transition-colors ${
                      active ? "bg-indigo-50" : "hover:bg-gray-100"
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <span className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${active ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-lg font-semibold text-black">{item.label}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-700" />
                  </button>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-gray-50 p-5">
          {activeTab === "curriculum" && (
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                <h2 className="text-[25px] font-semibold text-black">Create your content</h2>
              </div>

              <div className="space-y-5 p-4">
                {course.modules.map((mod) => (
                  <div key={mod.id} className="rounded-xl border border-gray-200 bg-white pb-4 pt-5">
                    {/* Section header */}
                    <div className="flex items-center justify-between">
                      {editingSectionId === mod.id ? (
                        <div className="flex flex-1 items-center gap-2 px-5">
                          <input
                            autoFocus
                            value={editingSectionTitle}
                            onChange={(e) => setEditingSectionTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveSectionTitle(mod.id); if (e.key === "Escape") setEditingSectionId(null); }}
                            className="h-10 flex-1 rounded-md border border-gray-300 px-3 text-base focus:border-indigo-600 focus:outline-none"
                          />
                          <button onClick={() => setEditingSectionId(null)} className="h-10 cursor-pointer rounded-md bg-gray-200 px-4 text-sm font-semibold hover:bg-gray-300">Cancel</button>
                          <button onClick={() => saveSectionTitle(mod.id)} className="h-10 cursor-pointer rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">Save</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingSectionId(mod.id); setEditingSectionTitle(mod.title); }}
                          title="Rename section"
                          className="-ml-px h-10 max-w-[70%] cursor-pointer truncate bg-indigo-600 pl-3.5 pr-9 text-left text-lg font-semibold leading-10 text-white"
                          style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)" }}
                        >
                          {mod.title}
                        </button>
                      )}
                      <div className="flex items-center gap-2 pr-4">
                        <button
                          onClick={() => { setEditingSectionId(mod.id); setEditingSectionTitle(mod.title); }}
                          aria-label="Rename section"
                          className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                        >
                          <Pencil className="h-3.5 w-3.5 text-gray-800" />
                        </button>
                        <button
                          onClick={() => deleteSection(mod.id)}
                          aria-label="Delete section"
                          className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-gray-800" />
                        </button>
                        <span className="p-1 text-gray-800">
                          <GripVertical className="h-5 w-5" />
                        </span>
                      </div>
                    </div>

                    {/* Chapters */}
                    <div className="mt-4 pl-16 pr-4">
                      {mod.lessons.map((lesson, lessonIdx) => {
                        const isExpanded = expandedChapters.has(lesson.id);
                        const isEditingDesc = editingDescription?.lessonId === lesson.id;
                        const isEditingTitle = editingChapter?.lessonId === lesson.id;
                        const isDragOver = dragOverTarget?.moduleId === mod.id && dragOverTarget?.lessonIdx === lessonIdx;
                        const isDragging = draggingLesson === lesson.id;
                        const dragFromAbove = dragItemRef.current && dragItemRef.current.moduleId === mod.id && dragItemRef.current.lessonIdx < lessonIdx;
                        const resources = parseResources(lesson);
                        const hasDescription = !!lesson.content && lesson.content !== "<p></p>";
                        return (
                          <div
                            key={lesson.id}
                            data-chapter
                            className="mb-4 transition-transform duration-200 ease-in-out"
                            style={{
                              transform: isDragOver ? (dragFromAbove ? "translateY(4px)" : "translateY(-4px)") : "translateY(0)",
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (dragItemRef.current?.moduleId === mod.id && dragItemRef.current.lessonIdx !== lessonIdx) {
                                setDragOverTarget({ moduleId: mod.id, lessonIdx });
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverTarget?.lessonIdx === lessonIdx) setDragOverTarget(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (dragItemRef.current?.moduleId === mod.id) {
                                reorderChapters(mod.id, dragItemRef.current.lessonIdx, lessonIdx);
                              }
                              dragItemRef.current = null;
                              setDragOverTarget(null);
                              setDraggingLesson(null);
                            }}
                          >
                            {isDragOver && !dragFromAbove && <div className="mx-2 mb-1.5 h-0.5 rounded-full bg-indigo-600" />}

                            <div className={`rounded-lg bg-gray-100 transition-opacity ${isDragging ? "opacity-50" : ""}`}>
                              {/* Chapter header row */}
                              {isEditingTitle && editingChapter ? (
                                <div className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <span className="shrink-0 text-xl font-semibold text-black">Chapter {lessonIdx + 1}:</span>
                                    <input
                                      autoFocus
                                      value={editingChapter.title}
                                      onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
                                      onKeyDown={(e) => { if (e.key === "Enter") saveChapterEdit(); if (e.key === "Escape") setEditingChapter(null); }}
                                      className="h-11 flex-1 rounded-md border border-gray-400 bg-white px-3 text-base focus:border-indigo-600 focus:outline-none"
                                    />
                                  </div>
                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-[104px]">
                                    <div className="flex items-center gap-3">
                                      <Toggle on={editingChapter.isFree} onChange={(v) => setEditingChapter({ ...editingChapter, isFree: v })} />
                                      <span className="text-base text-gray-900">Make this chapter free for locked course viewers.</span>
                                      <FreeInfo />
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button onClick={() => setEditingChapter(null)} className="h-11 cursor-pointer rounded-md bg-gray-200 px-5 text-base font-semibold text-black hover:bg-gray-300">Cancel</button>
                                      <button
                                        onClick={saveChapterEdit}
                                        disabled={!editingChapter.title.trim() || savingChapter}
                                        className="h-11 cursor-pointer rounded-md bg-indigo-600 px-5 text-base font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={`group flex h-16 cursor-pointer items-center justify-between px-4 ${isExpanded ? "border-b border-gray-200" : ""}`}
                                  onClick={() => toggleChapter(lesson.id)}
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <Caret open={isExpanded} />
                                    <span className="shrink-0 text-xl font-semibold text-black">Chapter {lessonIdx + 1}:</span>
                                    {lesson.videoUrl ? (
                                      isFileUrl(lesson.videoUrl) ? <MdPlayCircle className="h-6 w-6 shrink-0 text-[#4a4a5a]" /> : <MdLink className="h-5 w-5 shrink-0 text-gray-800" />
                                    ) : (
                                      <MdInsertDriveFile className="h-5 w-5 shrink-0 text-gray-800" />
                                    )}
                                    <span className="truncate text-lg text-black">{lesson.title}</span>
                                    {lesson.isFree && (
                                      <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">Free</span>
                                    )}
                                    <span className="ml-1 hidden items-center gap-2 group-hover:flex" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setEditingChapter({ moduleId: mod.id, lessonId: lesson.id, title: lesson.title, isFree: !!lesson.isFree })}
                                        aria-label="Edit chapter"
                                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                                      >
                                        <Pencil className="h-3.5 w-3.5 text-gray-800" />
                                      </button>
                                      <button
                                        onClick={() => deleteChapter(mod.id, lesson.id)}
                                        aria-label="Delete chapter"
                                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-gray-800" />
                                      </button>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                  {isExpanded && !lesson.videoUrl && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPickerClosed((prev) => { const n = new Set(prev); if (n.has(lesson.id)) n.delete(lesson.id); else n.add(lesson.id); return n; });
                                      }}
                                      className="flex h-10 cursor-pointer items-center gap-2 rounded-md bg-gray-200 px-4 text-base font-semibold text-black hover:bg-gray-300"
                                    >
                                      <Plus className="h-4 w-4" /> Content
                                    </button>
                                  )}
                                  <div
                                    draggable
                                    onDragStart={(e) => {
                                      dragItemRef.current = { moduleId: mod.id, lessonIdx };
                                      setDraggingLesson(lesson.id);
                                      e.dataTransfer.effectAllowed = "move";
                                      const el = e.currentTarget.closest("[data-chapter]") as HTMLElement;
                                      if (el) e.dataTransfer.setDragImage(el, 20, 20);
                                    }}
                                    onDragEnd={() => {
                                      dragItemRef.current = null;
                                      setDragOverTarget(null);
                                      setDraggingLesson(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    title="Drag to reorder"
                                    className="cursor-grab p-1 text-gray-800 active:cursor-grabbing"
                                  >
                                    <GripVertical className="h-5 w-5" />
                                  </div>
                                  </div>
                                </div>
                              )}

                              {/* Expanded chapter content */}
                              {isExpanded && !isEditingTitle && (
                                <div className="space-y-5 px-6 pb-[60px] pt-6">
                                  {/* Main content: picker until something is chosen */}
                                  {!lesson.videoUrl && !pickerClosed.has(lesson.id) && (
                                    <div className="relative py-2 text-center">
                                      <button
                                        onClick={() => setPickerClosed((prev) => new Set(prev).add(lesson.id))}
                                        aria-label="Close"
                                        className="absolute right-2 top-0 cursor-pointer p-1 text-gray-600 hover:text-black"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                      <p className="text-base text-black">
                                        Select the main type of content. Files and links can be added as resources.
                                      </p>
                                      <div className="mt-6 flex items-center justify-center gap-[38px]">
                                        <FileTile color="#e0486e" title="Upload video" onClick={() => setShowVideoModal({ moduleId: mod.id, lessonId: lesson.id, mode: "upload" })}>
                                          <MdPlayCircle className="h-6 w-6 text-white" />
                                        </FileTile>
                                        <FileTile color="#f59e0b" title="Upload audio" onClick={() => toast("Audio upload coming soon")}>
                                          <MdHeadset className="h-6 w-6 text-white" />
                                        </FileTile>
                                        <FileTile color="#17809b" title="Upload image" onClick={() => toast("Image upload coming soon")}>
                                          <MdImage className="h-6 w-6 text-white" />
                                        </FileTile>
                                        <FileTile color="#e53935" title="Upload PDF" onClick={() => toast("PDF upload coming soon")}>
                                          <span className="text-xs font-extrabold text-white">PDF</span>
                                        </FileTile>
                                        <FileTile color="#1fa463" title="Add discussion" onClick={() => toast("Coming soon")}>
                                          <MdQuestionAnswer className="h-6 w-6 text-white" />
                                        </FileTile>
                                        <FileTile color="#4f46e5" title="Add embedded link" onClick={() => setShowVideoModal({ moduleId: mod.id, lessonId: lesson.id, mode: "url" })}>
                                          <MdLink className="h-7 w-7 text-white" />
                                        </FileTile>
                                        <span className="h-12 w-px bg-gray-300" />
                                        <button
                                          type="button"
                                          aria-label="Add article"
                                          onClick={() => setEditingDescription({ moduleId: mod.id, lessonId: lesson.id, content: lesson.content || "" })}
                                          className="group relative cursor-pointer text-[#0f1c3f]"
                                        >
                                          <MdEditNote className="h-14 w-14" />
                                          <Tip text="Add article" />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Main content item */}
                                  {lesson.videoUrl && isFileUrl(lesson.videoUrl) && (
                                    <div className="flex items-center gap-4 rounded-lg bg-white px-5 py-4">
                                      <div className="flex h-[60px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0f1c3f]">
                                        {lesson.thumbnail ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={lesson.thumbnail} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <MdPlayArrow className="h-8 w-8 text-white" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-lg font-medium text-black">{lesson.videoName || fileNameFrom(lesson.videoUrl)}</p>
                                        <p className="mt-0.5 text-sm text-gray-600">
                                          {(lesson.videoName || fileNameFrom(lesson.videoUrl)).split(".").pop()?.toUpperCase() || "VIDEO"}
                                          {lesson.videoSize && Number(lesson.videoSize) > 0 ? ` \u2022 ${formatSize(Number(lesson.videoSize))}` : ""}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => setShowVideoModal({ moduleId: mod.id, lessonId: lesson.id, mode: "upload" })}
                                        aria-label="Edit content"
                                        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                                      >
                                        <Pencil className="h-4 w-4 text-gray-800" />
                                      </button>
                                    </div>
                                  )}
                                  {lesson.videoUrl && !isFileUrl(lesson.videoUrl) && (
                                    <div className="flex items-center gap-4 rounded-lg bg-white p-5">
                                      <div className="flex h-[67px] w-[91px] shrink-0 items-center justify-center overflow-hidden bg-[#0f1c3f]">
                                        {lesson.thumbnail ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={lesson.thumbnail} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <MdLink className="h-9 w-9 text-white" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-lg font-semibold text-black">Embedded Link</p>
                                        <p className="break-all text-base leading-6 text-indigo-600">{decodeUrl(lesson.videoUrl)}</p>
                                      </div>
                                      <button
                                        onClick={() => setShowVideoModal({ moduleId: mod.id, lessonId: lesson.id, mode: "url" })}
                                        aria-label="Edit content"
                                        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center self-start rounded-full bg-gray-200 hover:bg-gray-300"
                                      >
                                        <Pencil className="h-4 w-4 text-gray-800" />
                                      </button>
                                    </div>
                                  )}

                                  {/* Description */}
                                  {isEditingDesc && editingDescription ? (
                                    <div className="rounded-lg bg-white p-5">
                                      <h4 className="mb-3 text-lg font-semibold text-black">Chapter description</h4>
                                      <RichTextEditor
                                        value={editingDescription.content}
                                        onChange={(val) => setEditingDescription({ ...editingDescription, content: val })}
                                        placeholder="Write a description for this chapter..."
                                      />
                                      <div className="mt-3 flex justify-end gap-3">
                                        <button onClick={() => setEditingDescription(null)} className="h-10 cursor-pointer rounded-md bg-gray-200 px-5 text-sm font-semibold hover:bg-gray-300">Cancel</button>
                                        <button onClick={saveDescription} className="h-10 cursor-pointer rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">Save</button>
                                      </div>
                                    </div>
                                  ) : hasDescription ? (
                                    <div className="flex items-start gap-4 rounded-lg bg-white p-5">
                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-lg font-semibold text-black">Chapter description</h4>
                                        <div
                                          className="prose prose-sm mt-2 max-w-none text-base text-gray-800 [&_a]:text-indigo-600"
                                          dangerouslySetInnerHTML={{ __html: lesson.content! }}
                                        />
                                      </div>
                                      <button
                                        onClick={() => setEditingDescription({ moduleId: mod.id, lessonId: lesson.id, content: lesson.content || "" })}
                                        aria-label="Edit description"
                                        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                                      >
                                        <Pencil className="h-4 w-4 text-gray-800" />
                                      </button>
                                    </div>
                                  ) : null}

                                  {/* Resources */}
                                  {resources.length > 0 && (
                                    <div className="space-y-2">
                                      <h4 className="text-lg font-semibold text-black">Chapter resources</h4>
                                      {resources.map((res, ri) => (
                                        <div key={ri} className="flex items-center gap-3 rounded-lg bg-white p-3">
                                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-red-50">
                                            <span className="text-[10px] font-bold text-red-600">{res.type}</span>
                                          </div>
                                          <p className="min-w-0 flex-1 truncate text-base text-gray-800">{res.name}</p>
                                          <button
                                            onClick={() => deleteResource(mod.id, lesson.id, ri)}
                                            aria-label="Remove resource"
                                            className="cursor-pointer p-1 text-gray-400 hover:text-red-500"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="mt-10 flex flex-wrap items-center gap-[10px]">
                                    {!hasDescription && !isEditingDesc && (
                                      <button
                                        onClick={() => setEditingDescription({ moduleId: mod.id, lessonId: lesson.id, content: "" })}
                                        className="flex h-[45px] cursor-pointer items-center gap-2 rounded-md bg-gray-200 px-5 text-lg font-semibold text-black hover:bg-gray-300"
                                      >
                                        <Plus className="h-4 w-4" /> Add description
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        resourceTargetRef.current = { moduleId: mod.id, lessonId: lesson.id };
                                        resourceInputRef.current?.click();
                                      }}
                                      className="flex h-[45px] cursor-pointer items-center gap-2 rounded-md bg-indigo-600 px-5 text-lg font-semibold text-white hover:bg-indigo-700"
                                    >
                                      {uploadingResource === lesson.id ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                                      ) : (
                                        <><Upload className="h-4 w-4" /> Upload resources</>
                                      )}
                                    </button>
                                    {!lesson.videoUrl && pickerClosed.has(lesson.id) && (
                                      <button
                                        onClick={() => setPickerClosed((prev) => { const n = new Set(prev); n.delete(lesson.id); return n; })}
                                        className="cursor-pointer text-base text-indigo-600 hover:underline"
                                      >
                                        + Add content
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {isDragOver && dragFromAbove && <div className="mx-2 mt-1.5 h-0.5 rounded-full bg-indigo-600" />}
                          </div>
                        );
                      })}

                      {/* Add chapter */}
                      {addingChapter?.moduleId === mod.id ? (
                        <div className="rounded-lg bg-gray-100 px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Caret open={false} />
                            <span className="shrink-0 text-xl font-semibold text-black">Chapter {mod.lessons.length + 1}</span>
                            <input
                              autoFocus
                              value={addingChapter.title}
                              onChange={(e) => setAddingChapter({ ...addingChapter, title: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") addChapter(); if (e.key === "Escape") setAddingChapter(null); }}
                              placeholder="Add a title..."
                              className="h-11 flex-1 rounded-md border border-gray-900 bg-white px-3 text-base placeholder:text-gray-500 focus:outline-none"
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-[88px]">
                            <div className="flex items-center gap-3">
                              <Toggle on={addingChapter.isFree} onChange={(v) => setAddingChapter({ ...addingChapter, isFree: v })} />
                              <span className="text-base text-gray-900">Make this chapter free for locked course viewers.</span>
                              <FreeInfo />
                            </div>
                            <div className="flex items-center gap-3">
                              <button onClick={() => setAddingChapter(null)} className="h-11 cursor-pointer rounded-md bg-gray-200 px-5 text-base font-semibold text-black hover:bg-gray-300">Cancel</button>
                              <button
                                onClick={addChapter}
                                disabled={!addingChapter.title.trim() || savingChapter}
                                className="h-11 cursor-pointer rounded-md bg-indigo-600 px-5 text-base font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingChapter({ moduleId: mod.id, title: "", isFree: false })}
                          className="flex cursor-pointer items-center gap-2 py-1 text-lg text-indigo-600 hover:underline"
                        >
                          <Plus className="h-4 w-4" /> Add more chapters
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={addSection}
                  className="relative flex h-10 cursor-pointer items-center gap-2 pl-6 pr-10 text-base font-semibold text-black hover:text-indigo-600"
                >
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                    <polygon points="0.5,0.5 90,0.5 99.5,50 90,99.5 0.5,99.5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <Plus className="relative h-4 w-4" /> <span className="relative">Add new section</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "information" && (
            <CourseInfoTab
              key={course.id}
              course={course}
              videoChapters={course.modules.flatMap((m) => m.lessons.filter((l) => l.videoUrl).map((l) => ({ moduleId: m.id, lessonId: l.id })))}
              onSaved={fetchCourse}
            />
          )}
          {activeTab === "reviews" && <CourseReviewsTab key={course.id} courseId={course.id} />}

          {activeTab === "qna" && <CourseQnaTab key={course.id} courseId={course.id} />}

          {activeTab === "assignments" && <CourseAssignmentsTab key={course.id} />}

          {activeTab === "comments" && <CourseCommentsTab key={course.id} courseId={course.id} />}

          {activeTab === "report" && <CourseReportTab key={course.id} courseId={course.id} />}

          {activeTab === "drip" && (
            <CourseDripTab
              // Remount after a save so the saved values become the new starting point.
              key={`${course.id}-${course.dripType || ""}-${course.modules.map((m) => `${m.id}:${m.dripDays}:${m.dripDate}`).join("|")}`}
              courseId={course.id}
              initialType={(course.dripType as DripType) || ""}
              sections={course.modules.map((m) => ({
                id: m.id,
                title: m.title,
                chapterCount: m.lessons.length,
                dripDays: m.dripDays || "",
                dripDate: m.dripDate || "",
              }))}
              onSaved={fetchCourse}
            />
          )}
        </main>
      </div>

      {/* Video / embedded link dialog */}
      {showVideoModal && (
        <VideoDialog
          key={`${showVideoModal.lessonId}-${showVideoModal.mode}`}
          mode={showVideoModal.mode}
          currentUrl={course.modules
            .find((m) => m.id === showVideoModal.moduleId)
            ?.lessons.find((l) => l.id === showVideoModal.lessonId)?.videoUrl || ""}
          currentThumb={course.modules
            .find((m) => m.id === showVideoModal.moduleId)
            ?.lessons.find((l) => l.id === showVideoModal.lessonId)?.thumbnail || course.defaultThumbnail || ""}
          onSave={async (videoUrl, thumbnail, file) => {
            await updateChapter(showVideoModal.moduleId, showVideoModal.lessonId, {
              videoUrl,
              thumbnail,
              ...(file ? { videoName: file.name, videoSize: String(file.size) } : {}),
            });
            toast.success("Saved");
            setShowVideoModal(null);
          }}
          onClose={() => setShowVideoModal(null)}
        />
      )}

      {/* Hidden file input for resource uploads */}
      <input
        ref={resourceInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv,.png,.jpg,.jpeg,.gif,.mp3,.mp4"
        onChange={handleResourceUpload}
      />
    </div>
  );
}

/** The (i) next to the free-chapter switch, with the explanation on hover or focus. */
function FreeInfo() {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label="About free chapters" className="cursor-pointer text-gray-700">
        <InfoIcon className="h-4 w-4" />
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-80 -translate-x-1/2 rounded-lg bg-white p-4 text-base leading-6 text-gray-900 shadow-xl ring-1 ring-gray-200 group-focus-within:block group-hover:block">
        Making this chapter free, will show this chapter to the customer who&rsquo;s seeing the rest of the course as locked and is prompted to upgrade. You can show a course as locked to customers who haven&rsquo;t purchased it yet. This can be done from the Information tab.
      </span>
    </span>
  );
}
