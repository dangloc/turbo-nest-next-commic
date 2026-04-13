import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppProvider } from "../src/providers/app-provider";
import { Header } from "../src/components/header";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Commic Reader",
  description: "Discover and read comics from one storefront",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{ backgroundColor: "var(--bg, #f4f1ea)", color: "var(--ink, #1f1c1a)" }}>
        <AppProvider>
          <Header />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
