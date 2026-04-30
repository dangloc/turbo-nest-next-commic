import imageCompression from "browser-image-compression";

type UploadImageKind = "avatar" | "featured" | "banner";

const COMPRESSION_OPTIONS: Record<
  UploadImageKind,
  {
    maxSizeMB: number;
    maxWidthOrHeight: number;
  }
> = {
  avatar: {
    maxSizeMB: 0.35,
    maxWidthOrHeight: 512,
  },
  featured: {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
  },
  banner: {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 1920,
  },
};

function makeCompressedFileName(file: File) {
  const safeName = file.name.replace(/\.[^.]+$/, "") || "upload";
  return `${safeName}.webp`;
}

export async function compressImageForUpload(
  file: File,
  kind: UploadImageKind,
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      ...COMPRESSION_OPTIONS[kind],
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.82,
      alwaysKeepResolution: false,
    });

    if (compressed.size >= file.size) {
      return file;
    }

    return new File([compressed], makeCompressedFileName(file), {
      type: compressed.type || "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
