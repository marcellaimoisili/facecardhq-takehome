import type { Metadata } from "next";
import { Suspense } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import { HistorySidebar } from "@/components/HistorySidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Search",
  description: "Ask anything. Get an answer with sources.",
};

// Theme rule:
//   1. If user has explicitly toggled (localStorage 'theme' is 'dark' or 'light'), respect it.
//   2. Otherwise, default by local time: dark from 7pm to 7am, light otherwise.
const themeInit = `(function(){try{var t=localStorage.getItem('theme');var d;if(t==='dark'||t==='light'){d=t==='dark';}else{var h=new Date().getHours();d=h>=19||h<7;}if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen bg-bg text-ink antialiased">
        <Providers>
          <div className="flex min-h-screen">
            <Suspense fallback={<div className="hidden w-64 shrink-0 border-r border-border md:block" />}>
              <HistorySidebar />
            </Suspense>
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
