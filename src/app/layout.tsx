import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { AuthProvider } from "@/shared/context/AuthContext";
import { ToastProvider } from "@/shared/context/ToastContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <body>
        <ThemeProvider defaultTheme="light" storageKey="phifida-payroll-theme">
          <ToastProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
