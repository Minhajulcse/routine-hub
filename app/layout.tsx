import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Routine Hub",
  description: "Routine Hub - DIU section-wise routine explorer",
  manifest: "/manifest.webmanifest",
  themeColor: "#0a0f1d"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><ServiceWorkerRegister />{children}</body></html>;
}
