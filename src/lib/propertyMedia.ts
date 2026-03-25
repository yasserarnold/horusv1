import { supabase } from "./supabase";

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_PROPERTY_VIDEOS = 2;

const configuredBucket = String(
  import.meta.env.VITE_SUPABASE_PROPERTY_MEDIA_BUCKET || "property-media",
).trim();

export const PROPERTY_MEDIA_BUCKET = configuredBucket || "property-media";

type MediaFolder = "images" | "videos";

const sanitizeFileName = (value: string) => {
  const normalized = value.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  const collapsed = normalized
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");

  return collapsed || "file";
};

const getFileExtension = (file: File) => {
  const fromName = file.name.split(".").pop()?.trim().toLowerCase();
  if (fromName) return fromName;

  const fromType = file.type.split("/").pop()?.trim().toLowerCase();
  if (fromType) return fromType;

  return "bin";
};

export const uploadPropertyMediaFiles = async ({
  files,
  folder,
  propertyId,
}: {
  files: File[];
  folder: MediaFolder;
  propertyId: string;
}): Promise<string[]> => {
  const urls: string[] = [];

  for (const file of files) {
    const extension = getFileExtension(file);
    const baseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
    const filePath = `properties/${propertyId}/${folder}/${Date.now()}-${crypto.randomUUID()}-${baseName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PROPERTY_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(PROPERTY_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    urls.push(data.publicUrl);
  }

  return urls;
};

const getStoragePathFromPublicUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const marker = `/storage/v1/object/public/${PROPERTY_MEDIA_BUCKET}/`;
    const markerIndex = parsedUrl.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(
      parsedUrl.pathname.slice(markerIndex + marker.length),
    );
  } catch {
    return null;
  }
};

export const deletePropertyMediaUrls = async (urls: string[]) => {
  const paths = urls
    .map((url) => getStoragePathFromPublicUrl(url))
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) {
    return;
  }

  const { error } = await supabase.storage
    .from(PROPERTY_MEDIA_BUCKET)
    .remove(paths);

  if (error) {
    throw error;
  }
};
