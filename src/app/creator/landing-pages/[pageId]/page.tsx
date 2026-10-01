"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff, Save, Trash2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";

interface Section {
  id: string;
  type: string;
  position: number;
  content: Record<string, unknown>;
  visible: boolean;
}

interface PageData {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  metaPixelId: string | null;
  course: { title: string; price: number };
  sections: Section[];
}

const sectionLabels: Record<string, string> = {
  hero: "Hero Section",
  "course-info": "Course Information",
  "what-you-learn": "What You'll Learn",
  instructor: "Instructor",
  pricing: "Pricing",
  testimonials: "Testimonials",
  faq: "FAQ",
  cta: "Call to Action",
};

export default function LandingPageEditorPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = use(params);
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [metaPixelId, setMetaPixelId] = useState("");

  useEffect(() => { fetchPage(); }, [pageId]);

  async function fetchPage() {
    const res = await fetch(`/api/landing-pages/${pageId}`);
    if (!res.ok) { router.push("/creator/landing-pages"); return; }
    const data = await res.json();
    setPage(data);
    setMetaPixelId(data.metaPixelId || "");
    setLoading(false);
  }

  async function savePage() {
    if (!page) return;
    setSaving(true);
    try {
      await fetch(`/api/landing-pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaPixelId: metaPixelId || null,
          sections: page.sections,
        }),
      });
      toast.success("Page saved!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    await fetch(`/api/landing-pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !page?.published }),
    });
    toast.success(page?.published ? "Page unpublished" : "Page published!");
    fetchPage();
  }

  async function deletePage() {
    if (!confirm("Delete this landing page?")) return;
    await fetch(`/api/landing-pages/${pageId}`, { method: "DELETE" });
    toast.success("Page deleted");
    router.push("/creator/landing-pages");
  }

  function updateSectionContent(sectionId: string, key: string, value: unknown) {
    if (!page) return;
    setPage({
      ...page,
      sections: page.sections.map((s) =>
        s.id === sectionId ? { ...s, content: { ...s.content, [key]: value } } : s
      ),
    });
  }

  function toggleSectionVisibility(sectionId: string) {
    if (!page) return;
    setPage({
      ...page,
      sections: page.sections.map((s) =>
        s.id === sectionId ? { ...s, visible: !s.visible } : s
      ),
    });
  }

  function renderSectionEditor(section: Section) {
    const c = section.content as Record<string, string | number | string[] | Array<{ question: string; answer: string }>>;

    switch (section.type) {
      case "hero":
        return (
          <div className="space-y-3">
            <Input label="Heading" value={(c.heading as string) || ""} onChange={(e) => updateSectionContent(section.id, "heading", e.target.value)} />
            <Input label="Subheading" value={(c.subheading as string) || ""} onChange={(e) => updateSectionContent(section.id, "subheading", e.target.value)} />
            <Input label="CTA Text" value={(c.ctaText as string) || ""} onChange={(e) => updateSectionContent(section.id, "ctaText", e.target.value)} />
            <Input label="Background Image URL" value={(c.backgroundImage as string) || ""} onChange={(e) => updateSectionContent(section.id, "backgroundImage", e.target.value)} />
          </div>
        );
      case "course-info":
        return (
          <div className="space-y-3">
            <Input label="Title" value={(c.title as string) || ""} onChange={(e) => updateSectionContent(section.id, "title", e.target.value)} />
            <Textarea label="Description" value={(c.description as string) || ""} onChange={(e) => updateSectionContent(section.id, "description", e.target.value)} />
            <Textarea label="Features (one per line)" value={((c.features as string[]) || []).join("\n")} onChange={(e) => updateSectionContent(section.id, "features", e.target.value.split("\n"))} />
          </div>
        );
      case "what-you-learn":
        return (
          <div className="space-y-3">
            <Input label="Title" value={(c.title as string) || ""} onChange={(e) => updateSectionContent(section.id, "title", e.target.value)} />
            <Textarea label="Learning Points (one per line)" value={((c.items as string[]) || []).join("\n")} onChange={(e) => updateSectionContent(section.id, "items", e.target.value.split("\n"))} />
          </div>
        );
      case "instructor":
        return (
          <div className="space-y-3">
            <Input label="Name" value={(c.name as string) || ""} onChange={(e) => updateSectionContent(section.id, "name", e.target.value)} />
            <Textarea label="Bio" value={(c.bio as string) || ""} onChange={(e) => updateSectionContent(section.id, "bio", e.target.value)} />
            <Input label="Image URL" value={(c.image as string) || ""} onChange={(e) => updateSectionContent(section.id, "image", e.target.value)} />
          </div>
        );
      case "pricing":
        return (
          <div className="space-y-3">
            <Input label="Title" value={(c.title as string) || ""} onChange={(e) => updateSectionContent(section.id, "title", e.target.value)} />
            <Input label="CTA Text" value={(c.ctaText as string) || ""} onChange={(e) => updateSectionContent(section.id, "ctaText", e.target.value)} />
            <Textarea label="Features (one per line)" value={((c.features as string[]) || []).join("\n")} onChange={(e) => updateSectionContent(section.id, "features", e.target.value.split("\n"))} />
          </div>
        );
      case "faq":
        return (
          <div className="space-y-3">
            <Input label="Title" value={(c.title as string) || ""} onChange={(e) => updateSectionContent(section.id, "title", e.target.value)} />
            <p className="text-xs text-gray-500">Edit FAQ items below (JSON format for MVP):</p>
            <Textarea
              label="FAQ Items"
              value={JSON.stringify(c.items || [], null, 2)}
              onChange={(e) => { try { updateSectionContent(section.id, "items", JSON.parse(e.target.value)); } catch {} }}
              rows={6}
            />
          </div>
        );
      case "cta":
        return (
          <div className="space-y-3">
            <Input label="Heading" value={(c.heading as string) || ""} onChange={(e) => updateSectionContent(section.id, "heading", e.target.value)} />
            <Input label="Subheading" value={(c.subheading as string) || ""} onChange={(e) => updateSectionContent(section.id, "subheading", e.target.value)} />
            <Input label="CTA Text" value={(c.ctaText as string) || ""} onChange={(e) => updateSectionContent(section.id, "ctaText", e.target.value)} />
          </div>
        );
      default:
        return <p className="text-sm text-gray-500">No editor available for this section type.</p>;
    }
  }

  if (loading || !page) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div className="max-w-4xl">
      <button onClick={() => router.push("/creator/landing-pages")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to landing pages
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
          <p className="text-sm text-gray-500">Course: {page.course.title}</p>
        </div>
        <div className="flex gap-2">
          {page.published && (
            <a href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> View</Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={togglePublish}>
            {page.published ? <><EyeOff className="h-4 w-4" /> Unpublish</> : <><Eye className="h-4 w-4" /> Publish</>}
          </Button>
          <Button variant="danger" size="sm" onClick={deletePage}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader><h2 className="font-semibold">Settings</h2></CardHeader>
        <CardContent>
          <Input
            id="meta-pixel"
            label="Meta Pixel ID"
            placeholder="123456789012345"
            value={metaPixelId}
            onChange={(e) => setMetaPixelId(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="space-y-3 mb-6">
        {page.sections.map((section) => (
          <Card key={section.id} className={!section.visible ? "opacity-60" : ""}>
            <div
              className="w-full flex items-center justify-between px-6 py-4 cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{sectionLabels[section.type] || section.type}</span>
                {!section.visible && <span className="text-xs text-gray-400">(hidden)</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); toggleSectionVisibility(section.id); }}
                >
                  {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                {expandedSection === section.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
            {expandedSection === section.id && (
              <CardContent className="pt-0">{renderSectionEditor(section)}</CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={savePage} loading={saving}>
          <Save className="h-4 w-4" /> Save All Changes
        </Button>
      </div>
    </div>
  );
}
