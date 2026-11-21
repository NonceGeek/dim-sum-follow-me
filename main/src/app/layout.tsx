import type { Metadata } from "next";
import "./globals.css";
import { InkProvider } from "@/lib/ink/react/provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "跟住读 | 点心粤语跟读",
  description: "听一句，学一句，超有效！",
  icons: {
    icon: "/logos/logo.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Self-hosted Kevin Sans; data-ll-fonts stops the ink engine fetching it from github.io */}
        <link rel="stylesheet" href="/fonts/kevin-sans.css" data-ll-fonts="" />
      </head>
      <body>
        <InkProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </InkProvider>
      </body>
    </html>
  );
}
