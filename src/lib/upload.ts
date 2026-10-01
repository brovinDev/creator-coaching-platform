import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  duration?: number;
}

export interface UploadProvider {
  uploadVideo(file: Buffer, filename: string): Promise<UploadResult>;
  uploadImage(file: Buffer, filename: string): Promise<UploadResult>;
  deleteFile(publicId: string): Promise<void>;
}

const cloudinaryProvider: UploadProvider = {
  async uploadVideo(file: Buffer, filename: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "video",
            folder: "creator-platform/videos",
            public_id: filename.replace(/\.[^.]+$/, ""),
          },
          (error, result) => {
            if (error || !result) return reject(error || new Error("Upload failed"));
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              duration: result.duration,
            });
          }
        )
        .end(file);
    });
  },

  async uploadImage(file: Buffer, filename: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "image",
            folder: "creator-platform/images",
            public_id: filename.replace(/\.[^.]+$/, ""),
          },
          (error, result) => {
            if (error || !result) return reject(error || new Error("Upload failed"));
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
            });
          }
        )
        .end(file);
    });
  },

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  },
};

// Switch provider here when migrating to S3
// import { s3Provider } from "./upload-s3";
// export const upload: UploadProvider = s3Provider;
export const upload: UploadProvider = cloudinaryProvider;
