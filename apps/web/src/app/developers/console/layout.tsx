import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Console · Mealkey Developers",
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
