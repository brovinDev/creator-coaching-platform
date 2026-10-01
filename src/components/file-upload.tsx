"use client";

import { useState, useRef } from "react";
import { Upload, X, Film, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface FileUploadProps {
  type: "video" | "image";
  value: string;
  onChange: (url: string) => void;
  accept?: string;
}

export function FileUpload({ type, value, onChange, accept }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultAccept = type === "video" ? "video/mp4,video/webm,video/quicktime" : "image/*";

  async function handleUpload(file: File) {
    const maxSize = type === "video" ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${type === "video" ? "500MB" : "10MB"}`);
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      setProgress(30);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(90);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      onChange(data.url);
      setProgress(100);
      toast.success(`${type === "video" ? "Video" : "Image"} uploaded!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div>
      {value ? (
        <div className="relative bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            {type === "video" ? (
              <Film className="h-5 w-5 text-indigo-500 shrink-0" />
            ) : (
              <ImageIcon className="h-5 w-5 text-indigo-500 shrink-0" />
            )}
            <span className="text-sm text-gray-700 truncate flex-1">{value}</span>
            <button
              onClick={() => onChange("")}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            uploading ? "border-indigo-300 bg-indigo-50" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-gray-600">Uploading... {progress}%</p>
              <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">
                Click to upload {type === "video" ? "a video" : "an image"}
              </p>
              <p className="text-xs text-gray-400">
                {type === "video" ? "MP4, WebM, MOV up to 500MB" : "PNG, JPG, WebP up to 10MB"}
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept || defaultAccept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
