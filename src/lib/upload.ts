import { uploadFile } from "@/lib/nocode/client";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Uploads through the nocode backend, which stores the file with the org's connected
 * storage integration (Cloudinary). The backend rejects files over its MAX_FILE_SIZE (100 MB by default).
 */
export async function uploadMedia(file: File, filename: string, uploadedBy: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file, filename);
  formData.append("moduleName", "open-slate");
  formData.append("uploadedBy", uploadedBy);

  const json = (await uploadFile(formData, SYSTEM_TOKEN)) as { data?: { filePath?: string; publicId?: string } };
  if (!json.data?.filePath) throw new Error("Upload failed");
  return { url: json.data.filePath, publicId: json.data.publicId || "" };
}
