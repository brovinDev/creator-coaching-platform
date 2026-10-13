"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { ImageEditor } from "@/components/creator/image-editor";

export type VideoMode = "upload" | "url";

interface Props {
  mode: VideoMode;
  currentUrl: string;
  currentThumb: string;
  onSave: (videoUrl: string, thumbnail: string, file?: { name: string; size: number }) => void | Promise<void>;
  onClose: () => void;
}

const isFileUrl = (url: string) => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || /res\.cloudinary\.com/.test(url);

async function uploadFile(file: File, type: "video" | "image") {
  const body = new FormData();
  body.append("file", file);
  body.append("type", type);
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

/** TagMango's "Upload Video" dialog: a big drop area, an optional thumbnail, and a save button. */
export function VideoDialog({ mode, currentUrl, currentThumb, onSave, onClose }: Props) {
  const hadVideo = !!currentUrl && isFileUrl(currentUrl);
  const [videoUrl, setVideoUrl] = useState(currentUrl);
  const [thumbnail, setThumbnail] = useState(currentThumb);
  const [uploading, setUploading] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | undefined>();
  const [thumbUploading, setThumbUploading] = useState(false);
  const [editingThumb, setEditingThumb] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  async function pickVideo(file: File) {
    if (file.size > 500 * 1024 * 1024) return toast.error("File too large. Max 500MB.");
    setUploading(true);
    try {
      setVideoUrl(await uploadFile(file, "video"));
      setFileMeta({ name: file.name, size: file.size });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function uploadThumb(file: File) {
    setThumbUploading(true);
    try {
      setThumbnail(await uploadFile(file, "image"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setThumbUploading(false);
    }
  }

  async function save() {
    if (!videoUrl.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(videoUrl.trim(), thumbnail, mode === "upload" ? fileMeta : undefined);
    } finally {
      setSaving(false);
    }
  }

  const hasFile = !!videoUrl && isFileUrl(videoUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[650px] rounded-xl bg-white p-5 shadow-xl">
        <div className="relative flex h-10 items-center justify-center">
          <h3 className="text-2xl font-semibold text-black">{mode === "url" ? "Embedded Link" : "Upload Video"}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-0 top-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <X className="h-5 w-5 text-black" />
          </button>
        </div>

        {mode === "upload" ? (
          <div className="mt-12">
            {hasFile ? (
              <div className="relative overflow-hidden bg-black">
                <video src={videoUrl} poster={thumbnail || undefined} controls className="h-[273px] w-full object-contain" />
                <button
                  type="button"
                  onClick={() => !uploading && videoInput.current?.click()}
                  className="absolute right-3 top-3 cursor-pointer rounded-md bg-black px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  {uploading ? "Uploading..." : "Replace Video"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => !uploading && videoInput.current?.click()}
                className="flex h-[360px] w-full cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-[#eeeeee] px-6 text-center text-lg font-semibold text-black hover:bg-[#e8e8e8]"
              >
                {uploading ? (
                  <span className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" /> Uploading video...
                  </span>
                ) : (
                  "Click here to Upload video from Computer"
                )}
              </button>
            )}
            <input
              ref={videoInput}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) pickVideo(file);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="mt-10">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Paste a YouTube, Vimeo or video link"
              autoFocus
              className="h-[60px] w-full rounded-lg border border-gray-300 px-5 text-lg text-black placeholder:text-gray-500 focus:border-gray-500 focus:outline-none"
            />
          </div>
        )}

        {/* Thumbnail */}
        <div className="mt-8 grid grid-cols-[1fr_186px] items-start gap-4">
          <div>
            <p className="text-lg font-semibold text-black">Add Thumbnail (Optional)</p>
            <p className="mt-3 text-lg text-gray-500">You can upload a thumbnail for your video.</p>
          </div>
          <button
            type="button"
            onClick={() => !thumbUploading && thumbInput.current?.click()}
            title={thumbnail ? "Change thumbnail" : "Upload thumbnail"}
            className="group relative flex h-[113px] w-[186px] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-100"
          >
            {thumbUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            ) : thumbnail ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnail} alt="Thumbnail" className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Change
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-1 text-sm text-gray-500">
                <ImageIcon className="h-7 w-7" />
                Upload
              </span>
            )}
          </button>
          <input
            ref={thumbInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setEditingThumb(file);
              e.target.value = "";
            }}
          />
        </div>
        {thumbnail && !thumbUploading && (
          <div className="mt-1 flex justify-end pr-1">
            <button onClick={() => setThumbnail("")} className="cursor-pointer text-sm text-gray-500 hover:text-red-500">
              Remove thumbnail
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => toast("Subtitles are coming soon")}
          className="mt-8 flex h-[62px] w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 text-lg text-black hover:bg-gray-50"
        >
          + Add subtitle
        </button>

        <div className="mt-6 rounded-lg border border-[#f3e7bd] bg-[#fffaea] px-5 py-4 text-lg leading-7 text-black">
          Note: Videos uploaded here can&rsquo;t be downloaded later. Please keep a backup for your later use if required.
        </div>

        <button
          onClick={save}
          disabled={!videoUrl.trim() || saving || uploading}
          className="mt-3 h-[48px] w-full cursor-pointer rounded-md bg-indigo-600 text-lg font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : mode === "url" ? "Save" : hadVideo ? "Save changes" : "Start Video Processing"}
        </button>

        {mode === "upload" && hasFile && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => !uploading && videoInput.current?.click()}
              className="cursor-pointer text-lg text-red-600 underline hover:text-red-700"
            >
              Replace this video with a new file
            </button>
          </div>
        )}
      </div>

      {editingThumb && (
        <ImageEditor
          file={editingThumb}
          onCancel={() => setEditingThumb(null)}
          onSave={async (blob) => {
            await uploadThumb(new File([blob], "thumbnail.jpg", { type: "image/jpeg" }));
            setEditingThumb(null);
          }}
        />
      )}
    </div>
  );
}
