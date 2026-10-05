import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/auth/providers";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Knowledge Base",
  description: "Document knowledge base",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={sans.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
