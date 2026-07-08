import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ThemeSync } from "@/components/shared/theme-sync";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nova Finance — Personal Wealth Dashboard",
  description:
    "Track your expenses, income, budgets, and savings with Nova Finance, a clean and minimal personal finance dashboard.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nova",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeSync />
        <PwaRegister />
        <PwaInstallPrompt />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
