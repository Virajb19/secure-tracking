import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Space_Grotesk, Inter } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: "Secure Track - Admin CMS",
  description: "Government-grade secure tracking system for question paper delivery",
};

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '700'],
});


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} antialiased`} suppressHydrationWarning={true}>
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <QueryProvider>
            <NextTopLoader height={6} color="#0ea5e9" showSpinner={false} easing="ease"/>
            <Toaster position="bottom-right" richColors closeButton expand />
              {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
