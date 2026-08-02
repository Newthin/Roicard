import type { Metadata } from "next";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { ThemeProvider } from "@/components/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { themeInitScript } from "@/lib/theme/script";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "ROICARD",
    template: "%s | ROICARD",
  },
  description: "Digital business cards that track your ROI.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ROICARD",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-roicard-bg text-roicard-text antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
