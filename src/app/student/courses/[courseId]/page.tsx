"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, PlayCircle, FileText, CheckCircle, Circle } from "lucide-react";
import { VideoPlayer } from "@/components/video-player";
import toast from "react-hot-toast";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
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
  modules: Module[];
}

export default function StudentCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourse();
    fetchProgress();
  }, [courseId]);

  async function fetchCourse() {
    const res = await fetch(`/api/student/courses/${courseId}`);
    if (!res.ok) {
      router.push("/student");
      return;
    }
    const data = await res.json();
    setCourse(data);
    if (data.modules?.[0]?.lessons?.[0]) {
      setActiveLesson(data.modules[0].lessons[0]);
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
      if (completed) next.add(lessonId);
      else next.delete(lessonId);
      return next;
    });
    toast.success(completed ? "Lesson completed!" : "Marked as incomplete");
  }

  if (loading || !course) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <button
        onClick={() => router.push("/student")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{course.title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeLesson ? (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-4">{activeLesson.title}</h2>
                {activeLesson.videoUrl && (
                  <VideoPlayer key={activeLesson.id} url={activeLesson.videoUrl} thumbnail={activeLesson.thumbnail} className="mb-4" />
                )}
                {activeLesson.content && (
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {activeLesson.content}
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <Button
                    variant={completedLessons.has(activeLesson.id) ? "secondary" : "primary"}
                    onClick={() => toggleCompletion(activeLesson.id)}
                  >
                    {completedLessons.has(activeLesson.id) ? (
                      <><CheckCircle className="h-4 w-4" /> Completed</>
                    ) : (
                      <><Circle className="h-4 w-4" /> Mark as Complete</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Select a lesson to begin
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          {course.modules.map((mod) => (
            <Card key={mod.id}>
              <div className="px-4 py-3 bg-gray-50/70 rounded-t-xl">
                <h3 className="font-semibold text-sm">{mod.title}</h3>
              </div>
              <div className="py-1">
                {mod.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setActiveLesson(lesson)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 ${
                      activeLesson?.id === lesson.id ? "bg-indigo-50 text-indigo-700" : "text-gray-700"
                    }`}
                  >
                    {lesson.thumbnail ? (
                      <img src={lesson.thumbnail} alt="" className="h-8 w-14 rounded object-cover shrink-0" />
                    ) : completedLessons.has(lesson.id) ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : lesson.videoUrl ? (
                      <PlayCircle className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <span className="line-clamp-1">{lesson.title}</span>
                    {lesson.thumbnail && completedLessons.has(lesson.id) && (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
