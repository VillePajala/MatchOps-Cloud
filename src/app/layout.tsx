import type { Metadata, Viewport } from "next";
import { Rajdhani } from 'next/font/google';
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import QueryProvider from './QueryProvider';
// Removed unused imports:
// import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
// import InstallPrompt from "@/components/InstallPrompt";
// import I18nInitializer from "@/components/I18nInitializer";
import { Analytics } from "@vercel/analytics/react";
import { manifestConfig } from "@/config/manifest.config.js";
import { AuthProvider } from "@/context/AuthContext";
import AuthStorageSync from "@/components/AuthStorageSync";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SessionWarning } from "@/components/auth/SessionWarning";
import WebVitalsReporter from "@/components/WebVitalsReporter";

// Configure Rajdhani font
const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '600', '700'], // Include 700 for extra-bold headings
  variable: '--font-rajdhani',
});

// Determine the current branch
const branch = process.env.VERCEL_GIT_COMMIT_REF || 'development';
const config = manifestConfig[branch] || manifestConfig.default;

export const metadata: Metadata = {
  title: config.appName,
  description: "MatchOps Cloud: Plan • Track • Debrief - Cloud-based Soccer Management Platform for Coaches",
  icons: {
    icon: config.iconPath,
    apple: config.iconPath,
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: config.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Extract Supabase URL for preconnect (if available)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseHost: string | null = null;
  if (supabaseUrl) {
    try {
      supabaseHost = new URL(supabaseUrl).origin;
    } catch {
      // Invalid URL - skip preconnect
      console.warn('Invalid Supabase URL provided:', supabaseUrl);
    }
  }
  
  return (
    <html lang="fi">
      <head>
        {/* Performance optimizations: Preconnect to critical domains */}
        {supabaseHost && (
          <>
            <link rel="preconnect" href={supabaseHost} />
            <link rel="dns-prefetch" href={supabaseHost} />
          </>
        )}
        {/* Preconnect to Supabase storage if using different domain */}
        <link rel="preconnect" href="https://supabase.co" />
        <link rel="dns-prefetch" href="https://supabase.co" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={rajdhani.variable}>
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <AuthStorageSync />
              <SessionWarning />
              <WebVitalsReporter />
              <ClientWrapper>{children}</ClientWrapper>
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
