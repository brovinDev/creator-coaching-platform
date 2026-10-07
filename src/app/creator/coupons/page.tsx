"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticket, Plus, Search, ChevronDown, Check, Users, Info, X } from "lucide-react";
import toast from "react-hot-toast";

interface Coupon {
  id: string;
  code: string;
  service_id: string;
  discount_type: string;
  discount_value: number;
  max_usages: number | null;
  usage_count: number;
  start_date: string;
  end_date: string;
  status: string;
  target_customer: string;
}

interface ServiceOption {
  id: string;
  title: string;
}

type Filter = "all" | "active" | "inactive";

function CustomSelect({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected?.label || placeholder || "Select..."}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 flex items-center justify-between cursor-pointer ${
                value === o.value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"
              }`}
            >
              {o.label}
              {value === o.value && <Check className="h-4 w-4 text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelect({ selected, onChange, options, placeholder }: {
  selected: string[];
  onChange: (val: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(val: string) {
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer min-h-[42px]"
      >
        <span className={selectedLabels.length ? "text-gray-900 truncate pr-2" : "text-gray-400"}>
          {selectedLabels.length ? selectedLabels.join(", ") : placeholder || "Select services..."}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((o) => {
            const isSelected = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 flex items-center gap-2 cursor-pointer ${
                  isSelected ? "bg-indigo-50 text-indigo-700" : "text-gray-700"
                }`}
              >
                <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                }`}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
          {options.length === 0 && (
            <p className="px-3 py-2.5 text-sm text-gray-400">No services available</p>
          )}
        </div>
      )}
    </div>
  );
}

function LinkServiceInput({ services, selected, onChange }: {
  services: ServiceOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = services.filter(
    (s) => !selected.includes(s.id) && s.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className="border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] flex flex-wrap gap-1.5 items-center cursor-text"
      >
        {selected.map((id) => {
          const svc = services.find((s) => s.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded text-sm text-gray-800">
              {svc?.title || "Unknown"}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(selected.filter((v) => v !== id)); }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          placeholder={selected.length === 0 ? "Link service here" : ""}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 min-w-[120px] text-sm bg-transparent placeholder:text-gray-400 focus:outline-none py-0.5"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { onChange([...selected, s.id]); setQuery(""); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              {s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceSearchSelect({ services, selected, onChange }: {
  services: ServiceOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = services.filter(
    (s) => !selected.includes(s.id) && s.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        placeholder="Search and select specific customer"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-3 py-2.5 text-sm bg-transparent placeholder:text-gray-400 focus:outline-none rounded-lg"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { onChange([...selected, s.id]); setQuery(""); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              {s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: "",
    service_id: "all",
    discount_type: "percentage",
    discount_value: "",
    max_usages: "",
    start_date: "",
    end_date: "",
    target_customer: "all" as string,
    target_scope: "all" as "all" | "specific",
    target_service_ids: [] as string[],
  });

  useEffect(() => { fetchCoupons(); fetchServices(); }, []);

  async function fetchCoupons() {
    const res = await fetch("/api/coupons");
    if (res.ok) {
      const data = await res.json();
      setCoupons(data.map((c: Record<string, unknown>) => ({
        id: String(c.id),
        code: String(c.code || ""),
        service_id: String(c.service_id || "all"),
        discount_type: String(c.discount_type || "percentage"),
        discount_value: Number(c.discount_value) || 0,
        max_usages: c.max_usages ? Number(c.max_usages) : null,
        usage_count: Number(c.usage_count) || 0,
        start_date: String(c.start_date || ""),
        end_date: String(c.end_date || ""),
        status: String(c.status || "active"),
        target_customer: String(c.target_customer || "all"),
      })));
    }
    setLoading(false);
  }

  async function fetchServices() {
    const res = await fetch("/api/services");
    if (res.ok) {
      const data = await res.json();
      setServices(data.map((s: Record<string, unknown>) => ({
        id: String(s.id),
        title: String(s.title || ""),
      })));
    }
  }

  function openCreateModal() {
    setEditingCoupon(null);
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    setForm({
      code: "",
      service_id: "all",
      discount_type: "percentage",
      discount_value: "",
      max_usages: "",
      start_date: toLocalDatetime(now),
      end_date: toLocalDatetime(end),
      target_customer: "all",
      target_scope: "all",
      target_service_ids: [],
    });
    setShowCreate(true);
  }

  function openEditModal(coupon: Coupon) {
    setEditingCoupon(coupon);
    const targetIds = coupon.target_customer && coupon.target_customer !== "all"
      ? coupon.target_customer.split(",").filter(Boolean) : [];
    setForm({
      code: coupon.code,
      service_id: coupon.service_id,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      max_usages: coupon.max_usages ? String(coupon.max_usages) : "",
      start_date: toLocalDatetime(new Date(coupon.start_date)),
      end_date: toLocalDatetime(new Date(coupon.end_date)),
      target_customer: targetIds.length > 0 ? "specific" : "all",
      target_scope: targetIds.length > 0 ? "specific" : "all",
      target_service_ids: targetIds,
    });
    setShowCreate(true);
  }

  function toLocalDatetime(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) return;
    if (!form.discount_value || Number(form.discount_value) <= 0) {
      toast.error("Enter a valid discount value");
      return;
    }
    if (form.discount_type === "percentage" && Number(form.discount_value) > 100) {
      toast.error("Percentage cannot exceed 100%");
      return;
    }
    setSubmitting(true);
    try {
      const targetCustomer = form.target_customer === "specific" && form.target_service_ids.length > 0
        ? form.target_service_ids.join(",") : "all";

      const payload = {
        code: form.code,
        service_id: form.service_id,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_usages: form.max_usages ? Number(form.max_usages) : null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        target_customer: targetCustomer,
      };

      const url = editingCoupon ? `/api/coupons/${editingCoupon.id}` : "/api/coupons";
      const method = editingCoupon ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingCoupon ? "Coupon updated!" : "Coupon created!");
        setShowCreate(false);
        fetchCoupons();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save coupon");
      }
    } catch {
      toast.error("Failed to save coupon");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(coupon: Coupon) {
    const newStatus = coupon.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(newStatus === "active" ? "Coupon reactivated" : "Coupon deactivated");
      fetchCoupons();
    }
  }

  function getServiceName(serviceId: string) {
    if (serviceId === "all") return "All services";
    const svc = services.find((s) => s.id === serviceId);
    return svc ? svc.title : "Unknown";
  }

  function formatDiscount(coupon: Coupon) {
    if (coupon.discount_type === "percentage") return `-${coupon.discount_value}%`;
    return `-₹${coupon.discount_value}`;
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
      });
    } catch { return dateStr; }
  }

  function formatDatetimeDisplay(val: string) {
    try {
      const d = new Date(val);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const day = d.getDate();
      const suffix = day === 1 || day === 21 || day === 31 ? "st" : day === 2 || day === 22 ? "nd" : day === 3 || day === 23 ? "rd" : "th";
      const hours = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      return `${days[d.getDay()]}, ${months[d.getMonth()]} ${day}${suffix}, ${d.getFullYear()}, ${h12}:${mins} ${ampm}`;
    } catch { return val; }
  }

  function getTargetLabel(coupon: Coupon) {
    if (!coupon.target_customer || coupon.target_customer === "all") return null;
    const ids = coupon.target_customer.split(",").filter(Boolean);
    const names = ids.map((id) => {
      const svc = services.find((s) => s.id === id);
      return svc ? svc.title : "Unknown";
    });
    return names.join(", ");
  }

  const filtered = coupons
    .filter((c) => filter === "all" || c.status === filter)
    .filter((c) => c.code.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No coupons yet"
          description="Create discount coupons for your services."
          actionLabel="Create Coupon"
          onAction={openCreateModal}
        />
      ) : (
        <>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              {(["all", "active", "inactive"] as Filter[]).map((f) => (
                <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="filter"
                    checked={filter === f}
                    onChange={() => setFilter(f)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700 capitalize">{f}</span>
                </label>
              ))}
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by coupon code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Service</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Coupon Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Duration</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Usage</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((coupon) => {
                  const targetLabel = getTargetLabel(coupon);
                  return (
                    <tr key={coupon.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-5 py-4 text-sm text-gray-600 max-w-[200px]">
                        <div className="truncate">{getServiceName(coupon.service_id)}</div>
                        {targetLabel && (
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="h-3 w-3 text-indigo-500 shrink-0" />
                            <span className="text-xs text-indigo-600 truncate">Customers of: {targetLabel}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {coupon.code} <span className="text-gray-500">({formatDiscount(coupon)})</span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {coupon.status === "active" ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-green-100 text-green-700">Active</span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-red-100 text-red-600">Inactive</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {formatDate(coupon.start_date)} –<br />{formatDate(coupon.end_date)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {coupon.max_usages ? `${coupon.usage_count}/${coupon.max_usages}` : "N/A"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(coupon)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleStatus(coupon)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
                              coupon.status === "active"
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {coupon.status === "active" ? "Deactivate" : "Reactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-sm text-gray-400">No coupons found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={editingCoupon ? "Edit Coupon" : "Create Coupon"}>
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            Note: Coupon won&apos;t apply if it reduces the price below ₹1 (except 100% off)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Coupon Code */}
          <div className="relative">
            <Input
              placeholder="Enter Coupon Code"
              value={form.code}
              onChange={(e) => { if (e.target.value.length <= 100) setForm({ ...form, code: e.target.value.toUpperCase() }); }}
              maxLength={100}
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {form.code.length} / 100
            </span>
          </div>

          {/* Service selector */}
          <CustomSelect
            value={form.service_id}
            onChange={(val) => setForm({ ...form, service_id: val })}
            options={[
              { value: "all", label: "All services" },
              ...services.map((s) => ({ value: s.id, label: s.title })),
            ]}
          />

          {/* Discount type + value */}
          <div className="flex gap-2">
            <div className="w-48 shrink-0">
              <CustomSelect
                value={form.discount_type}
                onChange={(val) => setForm({ ...form, discount_type: val })}
                options={[
                  { value: "percentage", label: "Percentage Discount" },
                  { value: "fixed", label: "Flat Discount" },
                ]}
              />
            </div>
            <div className="flex-1 relative">
              <Input
                type="number"
                placeholder={form.discount_type === "percentage" ? "Discount %" : "Discount Amount"}
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                min={1}
                max={form.discount_type === "percentage" ? 100 : undefined}
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                {form.discount_type === "percentage" ? "%" : "₹"}
              </span>
            </div>
          </div>

          {/* Total usages */}
          <Input
            type="number"
            placeholder="Enter Total Usages (optional)"
            value={form.max_usages}
            onChange={(e) => setForm({ ...form, max_usages: e.target.value })}
            min={1}
          />

          {/* Target Customer */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-900">Target customer</span>
                <div className="group relative">
                  <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 px-3 py-2.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 w-64 leading-relaxed">
                    Enable the option to create coupon codes for customers of specific services, offering tailored discounts and personalised offers.
                    <div className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900" />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const enabled = form.target_customer === "all";
                  setForm({ ...form, target_customer: enabled ? "specific" : "all", target_service_ids: [] });
                }}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  form.target_customer === "specific" ? "bg-gray-900" : "bg-gray-300"
                }`}
              >
                <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all shadow-sm ${
                  form.target_customer === "specific" ? "left-[23px]" : "left-[3px]"
                }`} />
              </button>
            </div>

            {form.target_customer === "specific" && (
              <div className="mt-4 space-y-3">
                {/* Link service here — searchable with chips */}
                <LinkServiceInput
                  services={services}
                  selected={form.target_service_ids}
                  onChange={(ids) => setForm({ ...form, target_service_ids: ids })}
                />

                {/* Radio: All / Specific */}
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="target_scope"
                      checked={form.target_scope === "all"}
                      onChange={() => setForm({ ...form, target_scope: "all" })}
                      className="accent-gray-900"
                    />
                    <span className="text-sm text-gray-600">All customers</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="target_scope"
                      checked={form.target_scope === "specific"}
                      onChange={() => setForm({ ...form, target_scope: "specific" })}
                      className="accent-gray-900"
                    />
                    <span className="text-sm text-gray-600">Specific customer</span>
                  </label>
                </div>

                {/* Search and select specific customer */}
                {form.target_scope === "specific" && (
                  <div className="border border-gray-300 rounded-lg">
                    <ServiceSearchSelect
                      services={services}
                      selected={form.target_service_ids}
                      onChange={(ids) => setForm({ ...form, target_service_ids: ids })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 relative">
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
              />
              <div className="px-3 py-3 bg-gray-200 rounded-full text-xs font-semibold text-gray-900 text-center truncate cursor-pointer">
                {form.start_date ? formatDatetimeDisplay(form.start_date) : "Start date"}
              </div>
            </div>
            <span className="text-sm text-gray-400 shrink-0">to</span>
            <div className="flex-1 min-w-0 relative">
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
              />
              <div className="px-3 py-3 bg-gray-200 rounded-full text-xs font-semibold text-gray-900 text-center truncate cursor-pointer">
                {form.end_date ? formatDatetimeDisplay(form.end_date) : "End date"}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !form.code.trim()}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer"
          >
            {submitting ? "Saving..." : "Submit"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
