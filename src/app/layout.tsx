import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CV Analyzer",
  description: "Analyze your resumes instantly",
};

// FIX: Standard, robust TypeScript definition for Next.js Layouts
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        
        {/* Side Navigation */}
        <aside className="fixed top-0 left-0 z-40 w-50 h-screen bg-slate-900 text-white p-6 flex flex-col justify-between">
          <div className="ml-16">
            {/* FIX: Replaced custom layout-breaking "center" class with utility flex alignment */}
            <div className="text-xl font-bold tracking-wider mb-8 text-[#ffffff]-400 text-center bg-blue-500 py-2!">
              CV Analyzer
            </div>

            <nav className="flex flex-col space-y-2">
              <Link href="/" className="text-lg p-3! rounded-lg hover:bg-slate-800 transition font-medium block">
                Dashboard
              </Link>
              <Link href="/analyze" className="text-lg p-3! rounded-lg hover:bg-slate-800 transition font-medium block">
                Analyze
              </Link>
              {/* <Link href="/find" className="text-lg p-3! rounded-lg hover:bg-slate-800 transition font-medium block">
                Find Profile
              </Link> */}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
            v1.0.0
          </div>
        </aside>

        {/* Dynamic screens */}
        <main className="pl-64 min-h-screen" style={{ paddingLeft: "256px" }}>
          <div className="max-w-6xl mx-auto p-8">
            {children}
          </div>
        </main>

      </body>
    </html>
  );
}
