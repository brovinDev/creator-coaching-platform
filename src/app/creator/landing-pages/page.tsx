"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Plus, Eye, EyeOff, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  course: { title: string; price: number };
  _count: { sections: number };
}

interface CourseOption {
  id: string;
  title: string;
}

export default function LandingPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", courseId: "", metaPixelId: "" });

  useEffect(() => {
    fetchPages();
    fetchCourses();
  }, []);

  async function fetchPages() {
    const res = await fetch("/api/landing-pages");
    setPages(await res.json());
    setLoading(false);
  }

  async function fetchCourses() {
    const res = await fetch("/api/courses");
    setCourses(await res.json());
  }

  async function createPage() {
    if (!newForm.title || !newForm.courseId) {
      toast.error("Title and course are required");
      return;
    }
    const res = await fetch("/api/landing-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    const page = await res.json();
    toast.success("Landing page created!");
    setShowCreate(false);
    setNewForm({ title: "", courseId: "", metaPixelId: "" });
    router.push(`/creator/landing-pages/${page.id}`);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Create Page
        </Button>
      </div>

      {pages.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No landing pages yet"
          description="Create a landing page to promote and sell your courses."
          actionLabel="Create Page"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} className="cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
              onClick={() => router.push(`/creator/landing-pages/${page.id}`)}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{page.title}</h3>
                  {page.published ? (
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Live
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <EyeOff className="h-3 w-3" /> Draft
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">Course: {page.course.title}</p>
                {page.published && (
                  <a
                    href={`/p/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> /p/{page.slug}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Landing Page">
        <form onSubmit={(e) => { e.preventDefault(); createPage(); }} className="space-y-4">
          <Input
            id="page-title"
            label="Page Title"
            placeholder="e.g., React Masterclass Landing Page"
            value={newForm.title}
            onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={newForm.courseId}
              onChange={(e) => setNewForm({ ...newForm, courseId: e.target.value })}
              required
            >
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <Input
            id="meta-pixel"
            label="Meta Pixel ID (optional)"
            placeholder="123456789012345"
            value={newForm.metaPixelId}
            onChange={(e) => setNewForm({ ...newForm, metaPixelId: e.target.value })}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
