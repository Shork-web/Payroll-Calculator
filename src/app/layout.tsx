import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "PHILFIDA COS Salary Calculator",
  description: "Contract of Service salary calculator for PHILFIDA employees",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="light" storageKey="phifida-payroll-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
