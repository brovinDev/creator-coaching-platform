"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  PlayCircle,
  FileText,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  Download,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { VideoPlayer } from "@/components/video-player";
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
  resources: string | null;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  creatorName: string;
  modules: Module[];
}

type Tab = "description" | "resources" | "qna";

export default function StudentCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("description");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => { fetchCourse(); fetchProgress(); }, [courseId]);

  async function fetchCourse() {
    const res = await fetch(`/api/student/courses/${courseId}`);
    if (!res.ok) { router.push("/student"); return; }
    const data = await res.json();
    setCourse(data);
    if (data.modules?.[0]?.lessons?.[0]) {
      setActiveLesson(data.modules[0].lessons[0]);
      setActiveModule(data.modules[0]);
    }
    setLoading(false);
  }

  async function fetchProgress() {
    const res = await fetch(`/api/student/courses/${courseId}/progress`);
    if (res.ok) {
      const data = await res.json();
      setCompletedLessons(new Set(data.map((p: { lessonId: string }) => p.lessonId)));
    }
  }

  async function toggleCompletion(lessonId: string) {
    const completed = !completedLessons.has(lessonId);
    await fetch(`/api/student/courses/${courseId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, completed }),
    });
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (completed) next.add(lessonId); else next.delete(lessonId);
      return next;
    });
    toast.success(completed ? "Lesson completed!" : "Marked as incomplete");
  }

  function selectLesson(lesson: Lesson, mod: Module) {
    setActiveLesson(lesson);
    setActiveModule(mod);
    setTab("description");
  }

  function toggleSection(modId: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId); else next.add(modId);
      return next;
    });
  }

  function getLessonIcon(lesson: Lesson) {
    if (lesson.videoUrl) return <PlayCircle className="h-4 w-4 text-gray-400 shrink-0" />;
    return <FileText className="h-4 w-4 text-gray-400 shrink-0" />;
  }

  function getLessonType(lesson: Lesson) {
    if (lesson.videoUrl) return "Video";
    if (lesson.content) return "Text";
    return "Embedded Link";
  }

  function getResourceCount(lesson: Lesson): number {
    if (!lesson.resources) return 0;
    try { return JSON.parse(lesson.resources).length; } catch { return 0; }
  }

  if (loading || !course) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading...</div>;
  }

  return (
    <div className="-m-6 lg:-m-8 min-h-screen bg-white flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* Main content area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          {/* Video / Content area */}
          {activeLesson && (
            <>
              <div className="relative">
                {activeLesson.videoUrl ? (
                  <VideoPlayer
                    key={activeLesson.id}
                    url={activeLesson.videoUrl}
                    thumbnail={activeLesson.thumbnail}
                    className="!rounded-none"
                  />
                ) : (
                  <div className="aspect-video bg-gray-900 flex items-center justify-center">
                    <FileText className="h-16 w-16 text-gray-600" />
                  </div>
                )}

                {/* Sidebar toggle arrow on the right edge of video */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-l-lg p-2 cursor-pointer transition-colors"
                >
                  {sidebarOpen ? (
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>

              {/* Chapter title + tabs */}
              <div className="border-b border-gray-200">
                <div className="flex items-center justify-between px-6 pt-5 pb-1">
                  <h2 className="text-lg font-semibold text-gray-900">{activeLesson.title}</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleCompletion(activeLesson.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        completedLessons.has(activeLesson.id)
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {completedLessons.has(activeLesson.id) ? "Completed" : "Mark Complete"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center px-6 mt-2">
                  {(["description", "resources", "qna"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors cursor-pointer border-b-2 ${
                        tab === t
                          ? "border-gray-900 text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {t === "qna" ? "QnA" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="px-6 py-5 flex-1">
                {tab === "description" && (
                  <div className="prose prose-sm max-w-none text-gray-700">
                    {activeLesson.content ? (
                      <div dangerouslySetInnerHTML={{ __html: activeLesson.content }} />
                    ) : (
                      <p className="text-gray-400">No description available.</p>
                    )}
                  </div>
                )}
                {tab === "resources" && (() => {
                  let resources: Resource[] = [];
                  try { resources = activeLesson.resources ? JSON.parse(activeLesson.resources) : []; } catch { /* ignore */ }
                  return resources.length > 0 ? (
                    <div className="space-y-2">
                      {resources.map((res, i) => (
                        <a
                          key={i}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="w-9 h-9 rounded bg-red-50 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-red-600">{res.type}</span>
                          </div>
                          <span className="text-sm text-gray-700 flex-1 truncate">{res.name}</span>
                          <Download className="h-4 w-4 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No resources attached to this chapter.</p>
                  );
                })()}
                {tab === "qna" && (
                  <p className="text-sm text-gray-400">QnA coming soon.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right sidebar - Content list */}
        {sidebarOpen && (
          <div className="w-[340px] shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Content</h3>
            </div>

            <div className="flex-1 overflow-y-auto">
              {course.modules.map((mod) => {
                const isCollapsed = collapsedSections.has(mod.id);
                const completedInSection = mod.lessons.filter((l) => completedLessons.has(l.id)).length;

                return (
                  <div key={mod.id} className="border-b border-gray-100">
                    <button
                      onClick={() => toggleSection(mod.id)}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 text-left">{mod.title}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {completedInSection} of {mod.lessons.length}
                        </p>
                      </div>
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      )}
                    </button>

                    {!isCollapsed && (
                      <div className="pb-2">
                        {mod.lessons.map((lesson, idx) => {
                          const isActive = activeLesson?.id === lesson.id;
                          const isCompleted = completedLessons.has(lesson.id);
                          const resCount = getResourceCount(lesson);
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => selectLesson(lesson, mod)}
                              className={`w-full flex items-start gap-3 px-5 py-3 text-left transition-colors cursor-pointer ${
                                isActive ? "bg-gray-100" : "hover:bg-gray-50"
                              }`}
                            >
                              <span className="text-xs text-gray-400 font-medium mt-0.5 w-5 shrink-0">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-snug ${isActive ? "font-medium text-gray-900" : "text-gray-700"}`}>
                                  {lesson.title}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {getLessonType(lesson)}
                                  {resCount > 0 && ` · Resources (${resCount})`}
                                </p>
                              </div>
                              <div className="shrink-0 mt-0.5">
                                {isCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  getLessonIcon(lesson)
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
