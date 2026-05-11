import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "台灣主動型 ETF 持股追蹤",
  description: "比對 00981A、00988A、00991A 三支主動型 ETF 前10大持股",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
