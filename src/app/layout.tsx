import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "#components/common/Tooltip";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "MongoDB Paste the Plan",
  description:
    "Browser-based tool to analyze and share MongoDB explain plans with execution flow diagrams, SBE support, and indexing insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <main>{children}</main>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
