"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
  creatorAvatar: string | null;
  modules: Module[];
}

type Tab = "description" | "resources" | "qna";

export default function PreviewCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("description");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => { fetchCourse(); }, [courseId]);

  async function fetchCourse() {
    const res = await fetch(`/api/student/courses/${courseId}`);
    if (!res.ok) { router.push("/creator/courses"); return; }
    const data = await res.json();
    setCourse(data);
    if (data.modules?.[0]?.lessons?.[0]) {
      setActiveLesson(data.modules[0].lessons[0]);
    }
    setLoading(false);
  }

  function selectLesson(lesson: Lesson) {
    setActiveLesson(lesson);
    setTab("description");
  }

  function toggleSection(modId: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId); else next.add(modId);
      return next;
    });
  }

  function getLessonType(lesson: Lesson) {
    if (lesson.videoUrl) return "Embedded Link";
    if (lesson.content) return "Text";
    return "Embedded Link";
  }

  function getResourceCount(lesson: Lesson): number {
    if (!lesson.resources) return 0;
    try { return JSON.parse(lesson.resources).length; } catch { return 0; }
  }

  if (loading || !course) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">Loading...</div>;
  }

  const creatorInitials = course.creatorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Slim top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        {course.creatorAvatar ? (
          <img src={course.creatorAvatar} alt="" className="w-7 h-7 rounded-md object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
            {creatorInitials}
          </div>
        )}
        <span className="text-sm font-medium text-gray-900 truncate">{course.title}</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main content area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
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
                </div>
                <div className="flex items-center px-6 mt-2">
                  {(["description", "resources", "qna"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
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

                return (
                  <div key={mod.id} className="border-b border-gray-100">
                    <button
                      onClick={() => toggleSection(mod.id)}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 text-left">{mod.title}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          0 of {mod.lessons.length}
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
                          const resCount = getResourceCount(lesson);
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => selectLesson(lesson)}
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
                                {lesson.videoUrl ? (
                                  <PlayCircle className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <FileText className="h-4 w-4 text-gray-400" />
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
