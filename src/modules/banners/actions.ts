"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { InvalidImageFileError, uploadImage } from "@/lib/storage";
import { requireAdmin } from "@/modules/auth/session";
import { bannerInputSchema } from "@/validations/banner";
import { BannerNotFoundError, createBanner, deleteBanner, updateBanner } from "./mutations";

export type BannerActionState = { error?: string } | undefined;

function parseBannerForm(formData: FormData) {
  return bannerInputSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    ctaLabel: formData.get("ctaLabel"),
    ctaLink: formData.get("ctaLink"),
    isActive: formData.get("isActive"),
    sortOrder: formData.get("sortOrder"),
    imageUrl: formData.get("imageUrl"),
  });
}

async function uploadedImageUrl(formData: FormData): Promise<string | undefined> {
  const file = formData.get("imageFile");
  if (!(file instanceof File) || file.size === 0) return undefined;
  return uploadImage(file, "banners");
}

export async function createBannerAction(
  _prevState: BannerActionState,
  formData: FormData,
): Promise<BannerActionState> {
  await requireAdmin();
  const parsed = parseBannerForm(formData);
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? "Invalid input." };
  }

  let imageUrl: string | undefined;
  try {
    imageUrl = await uploadedImageUrl(formData);
  } catch (error) {
    if (error instanceof InvalidImageFileError) return { error: error.message };
    throw error;
  }
  imageUrl ??= parsed.data.imageUrl;
  if (!imageUrl) return { error: "Upload an image or provide an image URL." };

  await createBanner({ ...parsed.data, imageUrl });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  updateTag("banners");
  redirect("/admin/banners");
}

export async function updateBannerAction(
  _prevState: BannerActionState,
  formData: FormData,
): Promise<BannerActionState> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Invalid banner." };

  const parsed = parseBannerForm(formData);
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? "Invalid input." };
  }

  let uploadedUrl: string | undefined;
  try {
    uploadedUrl = await uploadedImageUrl(formData);
  } catch (error) {
    if (error instanceof InvalidImageFileError) return { error: error.message };
    throw error;
  }

  try {
    await updateBanner(id, { ...parsed.data, imageUrl: uploadedUrl ?? parsed.data.imageUrl });
  } catch (error) {
    if (error instanceof BannerNotFoundError) return { error: error.message };
    throw error;
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  updateTag("banners");
  redirect("/admin/banners");
}

export async function deleteBannerAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await deleteBanner(id);
  revalidatePath("/admin/banners");
  revalidatePath("/");
  updateTag("banners");
}
