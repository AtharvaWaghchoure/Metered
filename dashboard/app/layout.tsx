import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metered — Pay-Per-Call AI Gateway",
  description:
    "AI inference where agents pay in USDC over HTTP. No API keys. No accounts. Just a wallet and money.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-[#1a1a1a] text-[#111]">
        <div className="min-h-screen p-2.5 sm:p-4">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_20px_60px_rgba(0,0,0,0.3)]">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
