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
