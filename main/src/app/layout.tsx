import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
