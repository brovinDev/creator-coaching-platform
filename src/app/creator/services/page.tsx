"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Briefcase,
  Plus,
  Pencil,
  Search,
  RefreshCw,
  FileText,
  Share2,
  MoreHorizontal,
  Copy,
  EyeOff,
  Trash2,
  Link2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image: string | null;
  service_type: "one-time" | "subscription" | "free";
  status: string;
  currency: string;
  price: number;
  discounted_price: number | null;
  start_date: string | null;
  published: boolean;
  active_users: number;
  created_at: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(price: number, currency: string = "INR") {
  if (currency === "INR") return `₹${price.toLocaleString("en-IN")}`;
  return `${currency} ${price}`;
}

function ActionsMenu({
  service,
  onDelete,
  onClone,
  onToggleVisibility,
}: {
  service: Service;
  onDelete: (id: string) => void;
  onClone: (id: string) => void;
  onToggleVisibility: (service: Service) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(!open);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title="More actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="fixed w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]"
          style={{ top: pos.top, right: pos.right }}
        >
          <button
            onClick={() => {
              setOpen(false);
              onClone(service.id);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
          >
            <Copy className="h-4 w-4 shrink-0" />
            Clone
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onToggleVisibility(service);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
          >
            <EyeOff className="h-4 w-4 shrink-0" />
            {service.published ? "Hide" : "Show"}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              navigator.clipboard.writeText(
                `${window.location.origin}/checkout/${service.slug}`
              );
              toast.success("Payment success page link copied!");
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
          >
            <Link2 className="h-4 w-4 shrink-0" />
            Copy payment success page link
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete(service.id);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Delete
          </button>
        </div>
      )}
    </>
  );
}

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    setLoading(true);
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(data);
    } catch {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Service deleted");
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Failed to delete service");
    }
  }

  async function handleClone(id: string) {
    try {
      const res = await fetch(`/api/services/${id}`);
      if (!res.ok) throw new Error();
      const original = await res.json();
      const cloneRes = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${original.title} (Copy)`,
          description: original.description,
          cover_image: original.cover_image,
          service_type: original.service_type,
          currency: original.currency,
          price: original.price,
          discounted_price: original.discounted_price,
          enable_gst: original.enable_gst,
        }),
      });
      if (!cloneRes.ok) throw new Error();
      toast.success("Service cloned!");
      fetchServices();
    } catch {
      toast.error("Failed to clone service");
    }
  }

  async function handleToggleVisibility(service: Service) {
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !service.published }),
      });
      if (!res.ok) throw new Error();
      toast.success(service.published ? "Service hidden" : "Service published");
      setServices((prev) =>
        prev.map((s) =>
          s.id === service.id ? { ...s, published: !s.published } : s
        )
      );
    } catch {
      toast.error("Failed to update service");
    }
  }

  function handleShare(service: Service) {
    const url = `${window.location.origin}/checkout/${service.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Service link copied!");
  }

  const filtered = services.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <div className="flex items-center gap-3">
          <Link href="/creator/services/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create new service
            </Button>
          </Link>
          <Button variant="outline" onClick={fetchServices}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No services yet"
          description="Create your first service to start selling courses and workshops."
          actionLabel="Create new service"
          onAction={() => router.push("/creator/services/new")}
        />
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by service title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Price
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
                    Active Users
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Start Date
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {service.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        service id: {service.id}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {service.service_type === "free" ? (
                        <span className="text-sm text-gray-500">Free</span>
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900">
                            {formatPrice(service.price, service.currency)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {service.service_type}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-700">
                      {service.active_users}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {formatDate(service.start_date || service.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      {service.published ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-400 text-white">
                          DRAFT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            router.push(`/creator/services/${service.id}/edit`)
                          }
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/creator/services/${service.id}`)
                          }
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View details"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleShare(service)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Share"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        <ActionsMenu
                          service={service}
                          onDelete={handleDelete}
                          onClone={handleClone}
                          onToggleVisibility={handleToggleVisibility}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-gray-400"
                    >
                      No services match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
