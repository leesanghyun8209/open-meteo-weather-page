import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open-Meteo Weather",
  description: "Search current, past, and forecast weather with Open-Meteo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
