import type { Metadata } from "next";
import ReviewsClient from "./reviews-client";

export const metadata: Metadata = { title: "Nhận xét" };
export const instant = false;

export default function AdminReviewsPage() {
  return <ReviewsClient />;
}
