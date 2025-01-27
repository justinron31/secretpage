import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SECRET APP",
  description: "secret app is a secret",
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
