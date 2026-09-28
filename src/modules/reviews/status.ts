import type { reviewStatusEnum } from "@/db/schema";

export type ReviewStatus = (typeof reviewStatusEnum.enumValues)[number];

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending moderation",
  approved: "Approved",
  rejected: "Rejected",
};
