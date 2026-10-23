import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nakconel Bank",
  description: "Nakconel digital banking — Phase 1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a0505", color: "#f5e6c8" }}>
        {children}
      </body>
    </html>
  );
}
