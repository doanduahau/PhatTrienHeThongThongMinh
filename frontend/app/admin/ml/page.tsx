import type { Metadata } from "next";
import MlClient from "./ml-client";

export const metadata: Metadata = { title: "Gợi ý & ML" };
export const instant = false;

export default function AdminMlPage() {
  return <MlClient />;
}
