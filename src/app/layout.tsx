import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/bricolage-grotesque";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Cognify", template: "%s · Cognify" },
  description:
    "Adaptive learning workspace: a persistent skill graph that changes with your assessment evidence.",
};

export const viewport: Viewport = {
  themeColor: "#f6faf7",
};

// Applies the saved theme (or the OS preference) before first paint, so there is no flash.
const THEME_SCRIPT = `try{document.documentElement.classList.toggle("dark",localStorage.getItem("sf-theme")==="dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
