import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Scripture Display",
  description: "Real-time scripture display powered by AI voice recognition",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
