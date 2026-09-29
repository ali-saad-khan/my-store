import "server-only";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "product-images";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export class InvalidImageFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidImageFileError";
  }
}

/**
 * Uploads one admin-provided image file to Supabase Storage and returns its public URL.
 * Runs as the current (already `requireAdmin()`-checked) user's session — the actual write
 * is enforced again at the database level by this bucket's RLS policies
 * (0008_product_images_storage.sql), not just by this function's caller check.
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new InvalidImageFileError(`Unsupported image type: ${file.type || "unknown"}.`);
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new InvalidImageFileError("Image must be 5MB or smaller.");
  }

  const extension = file.type.split("/")[1];
  const path = `products/${crypto.randomUUID()}.${extension}`;

  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
