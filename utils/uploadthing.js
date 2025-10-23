import { createUploadthing } from "uploadthing/express";

const f = createUploadthing();

/**
 * Định nghĩa 2 endpoint mẫu:
 * - thumbnailUploader: 1 ảnh <= 2MB
 * - galleryUploader:  tối đa 8 ảnh, mỗi ảnh <= 4MB
 */
export const uploadRouter = {
  thumbnailUploader: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .onUploadComplete(async ({ file, metadata }) => {
      // TODO: Lưu DB thumbnail ở đây (file.url, file.name, file.size, ...)
      console.log("✅ Thumbnail uploaded:", file.url, metadata);
    }),

  galleryUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 8 } })
    .onUploadComplete(async ({ file, metadata }) => {
      // TODO: Lưu DB ảnh gallery
      console.log("✅ Gallery uploaded:", file.url, metadata);
    }),
};
