"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  PlayCircle,
  FileText,
  Link as LinkIcon,
  Upload,
  ImageIcon,
} from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import toast from "react-hot-toast";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  position: number;
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
  price: number;
  published: boolean;
  modules: Module[];
  _count: { enrollments: number };
}

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: 0, thumbnail: "" });
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: "", content: "", videoUrl: "", thumbnail: "" });
  const [videoMode, setVideoMode] = useState<"url" | "upload">("upload");
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lesson: Lesson } | null>(null);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  async function fetchCourse() {
    const res = await fetch(`/api/courses/${courseId}`);
    if (!res.ok) {
      router.push("/creator/courses");
      return;
    }
    const data = await res.json();
    setCourse(data);
    setForm({
      title: data.title,
      description: data.description || "",
      price: data.price,
      thumbnail: data.thumbnail || "",
    });
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Course saved!");
      fetchCourse();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
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

  async function deleteCourse() {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
    toast.success("Course deleted");
    router.push("/creator/courses");
  }

  async function addModule() {
    if (!newModuleTitle.trim()) return;
    await fetch(`/api/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newModuleTitle }),
    });
    setNewModuleTitle("");
    setShowAddModule(false);
    toast.success("Module added!");
    fetchCourse();
  }

  async function deleteModule(moduleId: string) {
    if (!confirm("Delete this module and all its lessons?")) return;
    await fetch(`/api/courses/${courseId}/modules/${moduleId}`, { method: "DELETE" });
    toast.success("Module deleted");
    fetchCourse();
  }

  async function addLesson(moduleId: string) {
    if (!lessonForm.title.trim()) return;
    await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lessonForm),
    });
    setLessonForm({ title: "", content: "", videoUrl: "", thumbnail: "" });
    setShowAddLesson(null);
    toast.success("Lesson added!");
    fetchCourse();
  }

  async function updateLesson(moduleId: string, lessonId: string) {
    await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lessonForm),
    });
    setEditingLesson(null);
    setLessonForm({ title: "", content: "", videoUrl: "", thumbnail: "" });
    toast.success("Lesson updated!");
    fetchCourse();
  }

  async function deleteLesson(moduleId: string, lessonId: string) {
    if (!confirm("Delete this lesson?")) return;
    await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { method: "DELETE" });
    toast.success("Lesson deleted");
    fetchCourse();
  }

  if (loading || !course) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => router.push("/creator/courses")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={togglePublish}>
            {course.published ? <><EyeOff className="h-4 w-4" /> Unpublish</> : <><Eye className="h-4 w-4" /> Publish</>}
          </Button>
          <Button variant="danger" size="sm" onClick={deleteCourse}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader><h2 className="font-semibold">Course Details</h2></CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="title"
            label="Title"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
          />
          <Textarea
            id="description"
            label="Description"
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
          />
          <Input
            id="price"
            label="Price (₹)"
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm(prev => ({ ...prev, price: Number(e.target.value) }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label>
            <FileUpload
              type="image"
              value={form.thumbnail}
              onChange={(url) => setForm(prev => ({ ...prev, thumbnail: url }))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveCourse} loading={saving}>
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Modules & Lessons</h2>
        <Button size="sm" onClick={() => setShowAddModule(true)}>
          <Plus className="h-4 w-4" /> Add Module
        </Button>
      </div>

      {course.modules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            No modules yet. Add your first module to start building your course.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {course.modules.map((mod) => (
            <Card key={mod.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <h3 className="font-semibold">{mod.title}</h3>
                  <span className="text-xs text-gray-400">({mod.lessons.length} lessons)</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddLesson(mod.id);
                      setLessonForm({ title: "", content: "", videoUrl: "", thumbnail: "" });
                    }}
                  >
                    <Plus className="h-4 w-4" /> Lesson
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteModule(mod.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              {mod.lessons.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {mod.lessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          {lesson.thumbnail ? (
                            <img src={lesson.thumbnail} alt="" className="h-9 w-16 rounded object-cover shrink-0" />
                          ) : lesson.videoUrl ? (
                            <PlayCircle className="h-4 w-4 text-indigo-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm">{lesson.title}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingLesson({ moduleId: mod.id, lesson });
                              setLessonForm({
                                title: lesson.title,
                                content: lesson.content || "",
                                videoUrl: lesson.videoUrl || "",
                                thumbnail: lesson.thumbnail || "",
                              });
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteLesson(mod.id, lesson.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showAddModule} onClose={() => setShowAddModule(false)} title="Add Module">
        <form onSubmit={(e) => { e.preventDefault(); addModule(); }} className="space-y-4">
          <Input
            id="module-title"
            label="Module Title"
            placeholder="e.g., Getting Started"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowAddModule(false)}>Cancel</Button>
            <Button type="submit">Add Module</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showAddLesson !== null}
        onClose={() => setShowAddLesson(null)}
        title="Add Lesson"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (showAddLesson) addLesson(showAddLesson);
          }}
          className="space-y-4"
        >
          <Input
            id="lesson-title"
            label="Lesson Title"
            placeholder="e.g., Introduction"
            value={lessonForm.title}
            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video (optional)</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setVideoMode("upload")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  videoMode === "upload" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <Upload className="h-3 w-3" /> Upload
              </button>
              <button
                type="button"
                onClick={() => setVideoMode("url")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  videoMode === "url" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <LinkIcon className="h-3 w-3" /> URL
              </button>
            </div>
            {videoMode === "upload" ? (
              <FileUpload
                type="video"
                value={lessonForm.videoUrl}
                onChange={(url) => setLessonForm(prev => ({ ...prev, videoUrl: url }))}
              />
            ) : (
              <Input
                id="lesson-video"
                placeholder="https://youtube.com/... or video URL"
                value={lessonForm.videoUrl}
                onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail (optional)</label>
            <FileUpload
              type="image"
              value={lessonForm.thumbnail}
              onChange={(url) => setLessonForm(prev => ({ ...prev, thumbnail: url }))}
            />
          </div>
          <Textarea
            id="lesson-content"
            label="Content (optional)"
            placeholder="Lesson notes, text content..."
            value={lessonForm.content}
            onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
            rows={4}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowAddLesson(null)}>Cancel</Button>
            <Button type="submit">Add Lesson</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editingLesson !== null}
        onClose={() => setEditingLesson(null)}
        title="Edit Lesson"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editingLesson) updateLesson(editingLesson.moduleId, editingLesson.lesson.id);
          }}
          className="space-y-4"
        >
          <Input
            id="edit-lesson-title"
            label="Lesson Title"
            value={lessonForm.title}
            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setVideoMode("upload")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  videoMode === "upload" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <Upload className="h-3 w-3" /> Upload
              </button>
              <button
                type="button"
                onClick={() => setVideoMode("url")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  videoMode === "url" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <LinkIcon className="h-3 w-3" /> URL
              </button>
            </div>
            {videoMode === "upload" ? (
              <FileUpload
                type="video"
                value={lessonForm.videoUrl}
                onChange={(url) => setLessonForm(prev => ({ ...prev, videoUrl: url }))}
              />
            ) : (
              <Input
                id="edit-lesson-video"
                placeholder="https://youtube.com/... or video URL"
                value={lessonForm.videoUrl}
                onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label>
            <FileUpload
              type="image"
              value={lessonForm.thumbnail}
              onChange={(url) => setLessonForm(prev => ({ ...prev, thumbnail: url }))}
            />
          </div>
          <Textarea
            id="edit-lesson-content"
            label="Content"
            value={lessonForm.content}
            onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
            rows={4}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setEditingLesson(null)}>Cancel</Button>
            <Button type="submit">Save Lesson</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
