"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { MdRotate90DegreesCcw, MdRotate90DegreesCw } from "react-icons/md";

// The crop frame on screen, and the picture that is saved (the cover/thumbnail size we ask for).
const STAGE_W = 608;
const STAGE_H = 364;
const FRAME_W = 502;
const FRAME_H = 283;
const OUT_W = 750;
const OUT_H = 422;

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const TILT_MAX = 45;

interface ImageEditorProps {
  file: File;
  onCancel: () => void;
  /** Called with the cropped picture, 750x422. */
  onSave: (blob: Blob) => void | Promise<void>;
}

/** TagMango's "Edit image" dialog: move, zoom and tilt the picture inside a fixed crop frame. */
export function ImageEditor({ file, onCancel, onSave }: ImageEditorProps) {
  const [src, setSrc] = useState("");
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [tilt, setTilt] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    // A data URL, not an object URL: nothing to revoke, and it survives React's double effect run.
    let cancelled = false;
    const reader = new FileReader();
    reader.onload = () => {
      if (!cancelled) setSrc(String(reader.result));
    };
    reader.readAsDataURL(file);
    return () => {
      cancelled = true;
    };
  }, [file]);

  // The picture starts large enough to fill the frame; zoom is on top of that.
  const base = natural ? Math.max(FRAME_W / natural.w, FRAME_H / natural.h) : 1;

  function reset() {
    setZoom(ZOOM_MIN);
    setTilt(0);
    setOffset({ x: 0, y: 0 });
  }

  async function save() {
    const img = imgRef.current;
    if (!img || !natural) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT_W;
      canvas.height = OUT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const k = OUT_W / FRAME_W;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUT_W, OUT_H);
      ctx.translate(OUT_W / 2 + offset.x * k, OUT_H / 2 + offset.y * k);
      ctx.rotate((tilt * Math.PI) / 180);
      const scale = base * zoom * k;
      ctx.scale(scale, scale);
      ctx.drawImage(img, -natural.w / 2, -natural.h / 2);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (blob) await onSave(blob);
    } finally {
      setSaving(false);
    }
  }

  const tiltPct = ((tilt + TILT_MAX) / (TILT_MAX * 2)) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-14"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-[650px] rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-black">Edit image</h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <X className="h-5 w-5 text-black" />
          </button>
        </div>

        {/* Stage: the picture under a dimmed layer, with the clear crop frame and a thirds grid on top */}
        <div
          className="relative mx-auto mt-8 cursor-grab touch-none select-none overflow-hidden rounded-xl bg-gray-500 active:cursor-grabbing"
          style={{ width: STAGE_W, height: STAGE_H, maxWidth: "100%" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            // The wrapper is scaled (zoom 0.8) so a pointer pixel is more than one layout pixel.
            const ratio = e.currentTarget.getBoundingClientRect().width / STAGE_W || 1;
            setOffset({
              x: drag.current.ox + (e.clientX - drag.current.x) / ratio,
              y: drag.current.oy + (e.clientY - drag.current.y) / ratio,
            });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          <div
            className="absolute bg-white"
            style={{ width: FRAME_W, height: FRAME_H, left: (STAGE_W - FRAME_W) / 2, top: (STAGE_H - FRAME_H) / 2 }}
          />
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: natural ? natural.w : undefined,
                height: natural ? natural.h : undefined,
                left: STAGE_W / 2 - (natural?.w ?? 0) / 2,
                top: STAGE_H / 2 - (natural?.h ?? 0) / 2,
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${tilt}deg) scale(${base * zoom})`,
                visibility: natural ? "visible" : "hidden",
              }}
            />
          )}
          <div
            className="pointer-events-none absolute"
            style={{
              width: FRAME_W,
              height: FRAME_H,
              left: (STAGE_W - FRAME_W) / 2,
              top: (STAGE_H - FRAME_H) / 2,
              boxShadow: "0 0 0 2000px rgba(0,0,0,0.5)",
              backgroundImage:
                "linear-gradient(to right, transparent 33%, rgba(255,255,255,.55) 33%, rgba(255,255,255,.55) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgba(255,255,255,.55) 66%, rgba(255,255,255,.55) calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(to bottom, transparent 33%, rgba(255,255,255,.55) 33%, rgba(255,255,255,.55) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgba(255,255,255,.55) 66%, rgba(255,255,255,.55) calc(66% + 1px), transparent calc(66% + 1px))",
            }}
          />
        </div>

        {/* Zoom */}
        <div className="mx-auto mt-6 flex items-center gap-4" style={{ width: STAGE_W - 100, maxWidth: "100%" }}>
          <span className="w-4 text-center text-lg text-gray-400">&minus;</span>
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1 flex-1 cursor-pointer accent-indigo-600"
          />
          <span className="w-4 text-center text-lg text-black">+</span>
        </div>

        {/* Tilt */}
        <div className="mx-auto mt-5 flex items-center gap-4" style={{ width: STAGE_W - 100, maxWidth: "100%" }}>
          <MdRotate90DegreesCcw className="h-5 w-5 shrink-0 text-black" />
          <div className="relative flex-1">
            <span
              className="pointer-events-none absolute bottom-full mb-3 min-w-[52px] -translate-x-1/2 rounded-lg bg-[#222] px-3 py-3 text-center text-base font-medium text-white"
              style={{ left: `calc(${tiltPct}% + ${(0.5 - tiltPct / 100) * 20}px)` }}
            >
              {tilt}
              <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-[#222]" />
            </span>
            <input
              type="range"
              min={-TILT_MAX}
              max={TILT_MAX}
              step={1}
              value={tilt}
              onChange={(e) => setTilt(Number(e.target.value))}
              aria-label="Tilt"
              className="h-1 w-full cursor-pointer accent-indigo-600"
            />
          </div>
          <MdRotate90DegreesCw className="h-5 w-5 shrink-0 text-black" />
        </div>

        <button
          onClick={reset}
          className="mt-4 h-[45px] w-full cursor-pointer rounded-md bg-gray-200 text-base font-semibold text-gray-800 hover:bg-gray-300"
        >
          Reset
        </button>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-[45px] cursor-pointer rounded-md bg-gray-200 px-5 text-base font-semibold text-gray-800 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!natural || saving}
            className="h-[45px] cursor-pointer rounded-md bg-indigo-600 px-5 text-base font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
