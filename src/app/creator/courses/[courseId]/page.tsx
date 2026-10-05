"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/file-upload";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Info,
  BarChart3,
  HelpCircle,
  ClipboardList,
  FileCheck,
  Star,
  PlayCircle,
  FileText,
  Image as ImageIcon,
  Headphones,
  Link as LinkIcon,
  File,
  Pencil,
  Trash2,
  X,
  Video,
  Upload,
  Paperclip,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

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
}

interface Module {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  modules: Module[];
  _count: { enrollments: number };
}

type SidebarTab = "curriculum" | "information";

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("curriculum");
  const [form, setForm] = useState({ title: "", description: "", thumbnail: "" });

  // Section (module) state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Chapter (lesson) state
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showContentPicker, setShowContentPicker] = useState<string | null>(null);
  const [showAddChapter, setShowAddChapter] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");

  // Upload/edit state
  const [showVideoModal, setShowVideoModal] = useState<{ moduleId: string; lessonId: string } | null>(null);
  const [editingDescription, setEditingDescription] = useState<{ moduleId: string; lessonId: string; content: string } | null>(null);

  // Resource upload state
  const [uploadingResource, setUploadingResource] = useState<string | null>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const resourceTargetRef = useRef<{ moduleId: string; lessonId: string } | null>(null);

  useEffect(() => { fetchCourse(); }, [courseId]);

  async function fetchCourse() {
    const res = await fetch(`/api/courses/${courseId}`);
    if (!res.ok) { router.push("/creator/courses"); return; }
    const data = await res.json();
    setCourse(data);
    setForm({ title: data.title, description: data.description || "", thumbnail: data.thumbnail || "" });
    setExpandedSections(new Set(data.modules.map((m: Module) => m.id)));
    setLoading(false);
  }

  async function saveCourse() {
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Failed to save"); }
      toast.success("Saved!");
      fetchCourse();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  }

  async function togglePublish() {
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
  async function addChapter(moduleId: string) {
    if (!newChapterTitle.trim()) return;
    await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newChapterTitle }),
    });
    setNewChapterTitle("");
    setShowAddChapter(null);
    fetchCourse();
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
    fetchCourse();
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

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleChapter(id: string) {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function getContentIcon(lesson: Lesson) {
    if (lesson.videoUrl) return <PlayCircle className="h-4 w-4 text-red-500" />;
    return <FileText className="h-4 w-4 text-blue-500" />;
  }

  if (loading || !course) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  const sidebarItems: { key: SidebarTab | string; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: "curriculum", label: "Curriculum", icon: <PlayCircle className="h-4 w-4" /> },
    { key: "information", label: "Information", icon: <Info className="h-4 w-4" /> },
    { key: "report", label: "Report", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "qna", label: "QnA", icon: <HelpCircle className="h-4 w-4" /> },
    { key: "analytics", label: "Assignment Analytics", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "submissions", label: "Submissions", icon: <FileCheck className="h-4 w-4" /> },
    { key: "reviews", label: "Course Reviews", icon: <Star className="h-4 w-4" /> },
  ];

  return (
    <div className="-m-6 lg:-m-8">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/creator/courses")}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-base font-semibold text-gray-900 truncate max-w-md">{course.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/checkout/${course.slug}`)}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Preview Changes
          </button>
          <button
            onClick={togglePublish}
            className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer ${
              course.published
                ? "bg-red-500 hover:bg-red-600"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {course.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-140px)]">
        {/* Sidebar */}
        <div className="w-60 border-r border-gray-100 bg-white shrink-0">
          <nav className="py-1">
            {sidebarItems.map((item) => {
              const isActive = item.key === activeTab;
              const isClickable = item.key === "curriculum" || item.key === "information";
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    if (isClickable) setActiveTab(item.key as SidebarTab);
                    else toast("Coming soon");
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "text-gray-900 font-medium bg-blue-50/50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? "text-red-500" : "text-gray-400"}>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 lg:p-8 bg-gray-50/50 overflow-y-auto">
          {activeTab === "curriculum" && (
            <div className="max-w-4xl">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Create your content</h2>

              {/* Sections */}
              {course.modules.map((mod, modIdx) => (
                <div
                  key={mod.id}
                  className="mb-4 border border-dashed border-gray-300 rounded-xl bg-blue-50/20 overflow-visible"
                >
                  {/* Section header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="shrink-0 text-xs font-bold text-white bg-gray-900 pl-2.5 pr-3 py-1 rounded-r-full rounded-l-sm flex items-center gap-0.5">
                      Section {modIdx + 1}
                      <ChevronRight className="h-3 w-3" />
                    </span>
                    {editingSectionId === mod.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          autoFocus
                          value={editingSectionTitle}
                          onChange={(e) => setEditingSectionTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveSectionTitle(mod.id); if (e.key === "Escape") setEditingSectionId(null); }}
                          className="flex-1 text-sm bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <button onClick={() => setEditingSectionId(null)} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer">Cancel</button>
                        <button onClick={() => saveSectionTitle(mod.id)} className="text-xs text-white bg-gray-900 px-3 py-1 rounded cursor-pointer">Save</button>
                      </div>
                    ) : (
                      <span
                        className="text-sm text-gray-700 cursor-pointer hover:text-gray-900 flex-1"
                        onClick={() => { setEditingSectionId(mod.id); setEditingSectionTitle(mod.title); }}
                      >
                        {mod.title}
                      </span>
                    )}
                    <button
                      onClick={() => deleteSection(mod.id)}
                      className="p-1 text-gray-300 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Chapters */}
                  <div className="px-4 pb-4">
                    {mod.lessons.map((lesson, lessonIdx) => {
                      const isExpanded = expandedChapters.has(lesson.id);
                      const isEditingDesc = editingDescription?.lessonId === lesson.id;
                      return (
                        <div key={lesson.id} className="mb-2">
                          {/* Chapter header row */}
                          <div
                            className="flex items-center justify-between py-2.5 px-3 bg-white/80 border border-gray-200 rounded-lg cursor-pointer hover:bg-white transition-colors"
                            onClick={() => toggleChapter(lesson.id)}
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                              )}
                              <span className="text-sm font-semibold text-gray-700">
                                Chapter {lessonIdx + 1}:
                              </span>
                              {getContentIcon(lesson)}
                              <span className="text-sm text-gray-600">{lesson.title}</span>
                            </div>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {!isExpanded && (
                                <button
                                  onClick={() => {
                                    setExpandedChapters((prev) => new Set(prev).add(lesson.id));
                                    setShowContentPicker(lesson.id);
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 cursor-pointer"
                                >
                                  + Content
                                </button>
                              )}
                              <button
                                onClick={() => deleteChapter(mod.id, lesson.id)}
                                className="p-1 text-gray-300 hover:text-red-500 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded chapter content */}
                          {isExpanded && (
                            <div className="ml-4 mt-1 p-4 bg-white/60 border border-gray-200 border-t-0 rounded-b-lg space-y-3">
                              {/* Content type picker */}
                              {showContentPicker === lesson.id && !lesson.videoUrl && (
                                <div className="text-center py-4">
                                  <p className="text-sm text-gray-500 mb-4">
                                    Select the main type of content. Files and links can be added as resources.
                                  </p>
                                  <div className="flex items-center justify-center gap-3">
                                    <button
                                      onClick={() => {
                                        setShowContentPicker(null);
                                        setShowVideoModal({ moduleId: mod.id, lessonId: lesson.id });
                                      }}
                                      className="w-12 h-12 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
                                      title="Upload Video"
                                    >
                                      <Video className="h-5 w-5 text-red-500" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowContentPicker(null);
                                        setShowVideoModal({ moduleId: mod.id, lessonId: lesson.id });
                                      }}
                                      className="w-12 h-12 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
                                      title="YouTube / URL"
                                    >
                                      <PlayCircle className="h-5 w-5 text-orange-500" />
                                    </button>
                                    <button
                                      onClick={() => toast("Audio upload coming soon")}
                                      className="w-12 h-12 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
                                      title="Audio"
                                    >
                                      <Headphones className="h-5 w-5 text-orange-400" />
                                    </button>
                                    <button
                                      onClick={() => toast("Image upload coming soon")}
                                      className="w-12 h-12 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
                                      title="Image"
                                    >
                                      <ImageIcon className="h-5 w-5 text-green-500" />
                                    </button>
                                    <button
                                      onClick={() => toast("PDF upload coming soon")}
                                      className="w-12 h-12 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
                                      title="PDF"
                                    >
                                      <span className="text-xs font-bold text-red-600">PDF</span>
                                    </button>
                                    <button
                                      onClick={() => toast("Link content coming soon")}
                                      className="w-12 h-12 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
                                      title="Link"
                                    >
                                      <LinkIcon className="h-5 w-5 text-blue-500" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowContentPicker(null);
                                        setEditingDescription({ moduleId: mod.id, lessonId: lesson.id, content: lesson.content || "" });
                                      }}
                                      className="w-12 h-12 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
                                      title="Text"
                                    >
                                      <FileText className="h-5 w-5 text-gray-600" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Video file info */}
                              {lesson.videoUrl && (
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                                  {lesson.thumbnail ? (
                                    <img src={lesson.thumbnail} alt="" className="w-14 h-10 rounded object-cover bg-gray-900" />
                                  ) : (
                                    <div className="w-14 h-10 rounded bg-gray-900 flex items-center justify-center">
                                      <PlayCircle className="h-5 w-5 text-white" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                      {lesson.title}.MP4
                                    </p>
                                    <p className="text-xs text-gray-400">MP4 · Video</p>
                                  </div>
                                  <button
                                    onClick={() => setShowVideoModal({ moduleId: mod.id, lessonId: lesson.id })}
                                    className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </div>
                              )}

                              {/* Description */}
                              {lesson.content && !isEditingDesc && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-800">Chapter Description</h4>
                                    <button
                                      onClick={() => setEditingDescription({ moduleId: mod.id, lessonId: lesson.id, content: lesson.content || "" })}
                                      className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <p className="text-sm text-gray-600">{lesson.content}</p>
                                </div>
                              )}

                              {/* Description editor */}
                              {isEditingDesc && editingDescription && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-gray-800">Chapter Description</h4>
                                  <textarea
                                    autoFocus
                                    value={editingDescription.content}
                                    onChange={(e) => setEditingDescription({ ...editingDescription, content: e.target.value })}
                                    placeholder="Write a description for this chapter..."
                                    rows={3}
                                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => setEditingDescription(null)}
                                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={saveDescription}
                                      className="px-4 py-1.5 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 cursor-pointer"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Chapter Resources */}
                              {(() => {
                                const resources = parseResources(lesson);
                                return resources.length > 0 ? (
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-gray-800">Chapter Resources</h4>
                                    <div className="space-y-1.5">
                                      {resources.map((res, ri) => (
                                        <div key={ri} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100">
                                          <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center shrink-0">
                                            <span className="text-[10px] font-bold text-red-600">{res.type}</span>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-700 truncate">{res.name}</p>
                                          </div>
                                          <button
                                            onClick={() => deleteResource(mod.id, lesson.id, ri)}
                                            className="p-1 text-gray-300 hover:text-red-500 cursor-pointer"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null;
                              })()}

                              {/* Action buttons when no content yet or adding more */}
                              {!isEditingDesc && (
                                <div className="flex items-center gap-3">
                                  {!lesson.content && (
                                    <button
                                      onClick={() => setEditingDescription({ moduleId: mod.id, lessonId: lesson.id, content: "" })}
                                      className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                                    >
                                      + Description
                                    </button>
                                  )}
                                  {!lesson.videoUrl && showContentPicker !== lesson.id && (
                                    <button
                                      onClick={() => setShowContentPicker(lesson.id)}
                                      className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                                    >
                                      + Content
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      resourceTargetRef.current = { moduleId: mod.id, lessonId: lesson.id };
                                      resourceInputRef.current?.click();
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer flex items-center gap-1"
                                  >
                                    {uploadingResource === lesson.id ? (
                                      <><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</>
                                    ) : (
                                      <>+ Resources</>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add chapter inline */}
                    {showAddChapter === mod.id ? (
                      <div className="flex items-center gap-2 mt-2 px-3">
                        <input
                          autoFocus
                          value={newChapterTitle}
                          onChange={(e) => setNewChapterTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") addChapter(mod.id); if (e.key === "Escape") { setShowAddChapter(null); setNewChapterTitle(""); } }}
                          placeholder="Chapter title..."
                          className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <button onClick={() => { setShowAddChapter(null); setNewChapterTitle(""); }} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer">Cancel</button>
                        <button onClick={() => addChapter(mod.id)} className="text-xs text-white bg-gray-900 px-3 py-1.5 rounded cursor-pointer">Add</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setShowAddChapter(mod.id); setNewChapterTitle(""); }}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 mt-3 px-3 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add more chapters
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add new section */}
              <button
                onClick={addSection}
                className="w-auto py-2.5 px-5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                + Add new section
              </button>
            </div>
          )}

          {activeTab === "information" && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Course Information</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <Input
                  id="title"
                  label="Title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  id="description"
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={5}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label>
                  <FileUpload
                    type="image"
                    value={form.thumbnail}
                    onChange={(url) => setForm((prev) => ({ ...prev, thumbnail: url }))}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveCourse} loading={saving}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Video Modal */}
      <Modal
        open={showVideoModal !== null}
        onClose={() => setShowVideoModal(null)}
        title="Upload Video"
      >
        {showVideoModal && (
          <VideoUploadContent
            moduleId={showVideoModal.moduleId}
            lessonId={showVideoModal.lessonId}
            currentUrl={course.modules
              .find((m) => m.id === showVideoModal.moduleId)
              ?.lessons.find((l) => l.id === showVideoModal.lessonId)?.videoUrl || ""}
            currentThumb={course.modules
              .find((m) => m.id === showVideoModal.moduleId)
              ?.lessons.find((l) => l.id === showVideoModal.lessonId)?.thumbnail || ""}
            onSave={async (videoUrl, thumbnail) => {
              await updateChapter(showVideoModal.moduleId, showVideoModal.lessonId, { videoUrl, thumbnail });
              toast.success("Video saved");
              setShowVideoModal(null);
            }}
            onClose={() => setShowVideoModal(null)}
          />
        )}
      </Modal>

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

function VideoUploadContent({
  currentUrl,
  currentThumb,
  onSave,
  onClose,
}: {
  moduleId: string;
  lessonId: string;
  currentUrl: string;
  currentThumb: string;
  onSave: (videoUrl: string, thumbnail: string) => void;
  onClose: () => void;
}) {
  const [videoUrl, setVideoUrl] = useState(currentUrl);
  const [thumbnail, setThumbnail] = useState(currentThumb);
  const [mode, setMode] = useState<"upload" | "url">("upload");

  return (
    <div className="space-y-4">
      {/* Video preview */}
      {videoUrl && (
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video
            src={videoUrl}
            controls
            className="w-full max-h-64 object-contain"
          />
          <button
            onClick={() => setVideoUrl("")}
            className="absolute top-2 right-2 text-xs text-gray-300 hover:text-white bg-black/50 px-2 py-1 rounded cursor-pointer"
          >
            Replace Video
          </button>
        </div>
      )}

      {/* Upload area */}
      {!videoUrl && (
        <div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode("upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                mode === "upload" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <Upload className="h-3 w-3" /> Upload
            </button>
            <button
              onClick={() => setMode("url")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                mode === "url" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <LinkIcon className="h-3 w-3" /> URL
            </button>
          </div>
          {mode === "upload" ? (
            <FileUpload type="video" value={videoUrl} onChange={setVideoUrl} />
          ) : (
            <input
              type="text"
              placeholder="https://youtube.com/... or video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          )}
        </div>
      )}

      {/* Thumbnail */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">Add Thumbnail (Optional)</p>
        <p className="text-xs text-gray-400 mb-2">You can upload a thumbnail for your video.</p>
        <FileUpload type="image" value={thumbnail} onChange={setThumbnail} />
      </div>

      {/* Save button */}
      <button
        onClick={() => onSave(videoUrl, thumbnail)}
        disabled={!videoUrl}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer"
      >
        Save Video
      </button>
    </div>
  );
}
