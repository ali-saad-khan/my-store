"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdmin } from "@/modules/auth/session";
import { moderateReviewSchema, reviewInputSchema } from "@/validations/review";
import { deleteReviewAsCustomer, moderateReview, ReviewNotFoundError, upsertReview } from "./mutations";

export type ReviewActionState = { error?: string; success?: string } | undefined;

export async function submitReviewAction(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to leave a review." };

  const parsed = reviewInputSchema.safeParse({
    productId: formData.get("productId"),
    productSlug: formData.get("productSlug"),
    rating: formData.get("rating"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? "Invalid input." };
  }

  await upsertReview({
    profileId: user.id,
    productId: parsed.data.productId,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
  });

  revalidatePath(`/products/${parsed.data.productSlug}`);
  return { success: "Review submitted for moderation." };
}

export async function deleteReviewAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const id = formData.get("id");
  const productSlug = formData.get("productSlug");
  if (typeof id !== "string" || !id) return;

  try {
    await deleteReviewAsCustomer(id, user.id);
  } catch (error) {
    if (error instanceof ReviewNotFoundError) return;
    throw error;
  }

  if (typeof productSlug === "string" && productSlug) {
    revalidatePath(`/products/${productSlug}`);
  }
}

export async function moderateReviewAction(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  await requireAdmin();

  const parsed = moderateReviewSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Invalid input." };

  try {
    await moderateReview(parsed.data.id, parsed.data.status);
  } catch (error) {
    if (error instanceof ReviewNotFoundError) return { error: error.message };
    throw error;
  }

  revalidatePath("/admin/reviews");
  return { success: "Review updated." };
}
