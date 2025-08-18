
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster";
import { BottomNav } from "@/components/bottom-nav";
import { PermissionsDialog } from "@/components/permissions-dialog";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/context/auth-context";
import { FirebaseMessagingProvider } from "@/context/firebase-messaging-context";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Flow V6",
  description: "Discover, share, and purchase products curated by your network.",
  manifest: "/manifest.json",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-body antialiased",
          inter.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="mint"
          themes={["light", "dark", "rainbow"]}
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <FirebaseMessagingProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1 pb-20 md:pb-0">
                  {children}
                </main>
                <div className="md:hidden">
                  <BottomNav />
                </div>
              </div>
              <Toaster />
              <PermissionsDialog />
            </FirebaseMessagingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
