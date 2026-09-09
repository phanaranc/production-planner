import type { Metadata } from "next";
import { Noto_Sans_Thai, Inter } from "next/font/google";
import "./globals.css";

const notoThai = Noto_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "700"], variable: "--font-noto-thai" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GENCO Production Waste Management Planner",
  description: "ระบบวางแผนการผลิต แผนก Production Waste Management"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${notoThai.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-surface font-thai">{children}</body>
    </html>
  );
}
