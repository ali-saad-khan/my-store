"use server";

import { revalidatePath, updateTag } from "next/cache";
import { InvalidImageFileError, uploadImage } from "@/lib/storage";
import { requireAdmin } from "@/modules/auth/session";
import {
  HOMEPAGE_SECTION_KEYS,
  headingOnlyContentSchema,
  newsletterContentSchema,
  promoContentSchema,
  type HomepageSectionKey,
} from "@/validations/homepage";
import { setSectionVisibility, updateSectionContent } from "./mutations";

export type HomepageActionState = { error?: string; success?: boolean } | undefined;

function parseKey(formData: FormData): HomepageSectionKey | null {
  const key = formData.get("key");
  if (typeof key !== "string" || !HOMEPAGE_SECTION_KEYS.includes(key as HomepageSectionKey)) {
    return null;
  }
  return key as HomepageSectionKey;
}

export async function toggleSectionVisibilityAction(formData: FormData) {
  await requireAdmin();
  const key = parseKey(formData);
  if (!key) return;

  const isVisible = formData.get("isVisible") === "true";
  await setSectionVisibility(key, isVisible);

  revalidatePath("/admin/homepage");
  revalidatePath("/");
  updateTag("homepage-sections");
}

export async function updateSectionContentAction(
  _prevState: HomepageActionState,
  formData: FormData,
): Promise<HomepageActionState> {
  await requireAdmin();
  const key = parseKey(formData);
  if (!key) return { error: "Invalid section." };

  if (key === "promo") {
    let imageUrl: string | undefined;
    const file = formData.get("imageFile");
    if (file instanceof File && file.size > 0) {
      try {
        imageUrl = await uploadImage(file, "homepage");
      } catch (error) {
        if (error instanceof InvalidImageFileError) return { error: error.message };
        throw error;
      }
    }

    const parsed = promoContentSchema.safeParse({
      eyebrow: formData.get("eyebrow"),
      heading: formData.get("heading"),
      subcopy: formData.get("subcopy"),
      ctaLabel: formData.get("ctaLabel"),
      ctaLink: formData.get("ctaLink"),
      imageUrl: formData.get("imageUrl"),
    });
    if (!parsed.success) {
      const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
      return { error: firstError ?? "Invalid input." };
    }

    await updateSectionContent(key, { ...parsed.data, imageUrl: imageUrl ?? parsed.data.imageUrl });
  } else if (key === "newsletter") {
    const parsed = newsletterContentSchema.safeParse({
      heading: formData.get("heading"),
      subcopy: formData.get("subcopy"),
    });
    if (!parsed.success) {
      const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
      return { error: firstError ?? "Invalid input." };
    }
    await updateSectionContent(key, parsed.data);
  } else if (key === "categories" || key === "featured_products") {
    const parsed = headingOnlyContentSchema.safeParse({ heading: formData.get("heading") });
    if (!parsed.success) {
      const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
      return { error: firstError ?? "Invalid input." };
    }
    await updateSectionContent(key, parsed.data);
  } else {
    return { error: "This section has no editable content." };
  }

  revalidatePath("/admin/homepage");
  revalidatePath("/");
  updateTag("homepage-sections");
  return { success: true };
}
