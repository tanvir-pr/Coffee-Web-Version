import type { Metadata } from "next";
import { LampLogin } from "@/components/auth/LampLogin";

export const metadata: Metadata = {
  title: "Sign in · Crema",
  description: "Pull the café lamp and sign in with email or Google.",
};

export default function LoginPage() {
  return <LampLogin />;
}
