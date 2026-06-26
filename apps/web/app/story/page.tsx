import type { Metadata } from "next";
import { StoryPage } from "@/components/story/StoryPage";

export const metadata: Metadata = { title: "Our story · Crema" };

export default function Page() {
  return <StoryPage />;
}
