import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "抖音账号分析系统",
  description: "抖音账号数据分析与报告生成系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
