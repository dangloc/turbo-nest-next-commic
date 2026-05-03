import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppProvider } from "../src/providers/app-provider";
import { Footer } from "../src/components/footer";
import "./globals.css";

const nunito = localFont({
  src: [
    { path: "./fonts/nunito/Nunito-ExtraLight.woff", weight: "200", style: "normal" },
    { path: "./fonts/nunito/Nunito-ExtraLightItalic.woff", weight: "200", style: "italic" },
    { path: "./fonts/nunito/Nunito-Light.woff", weight: "300", style: "normal" },
    { path: "./fonts/nunito/Nunito-LightItalic.woff", weight: "300", style: "italic" },
    { path: "./fonts/nunito/Nunito-Regular.woff", weight: "400", style: "normal" },
    { path: "./fonts/nunito/Nunito-Italic.woff", weight: "400", style: "italic" },
    { path: "./fonts/nunito/Nunito-Medium.woff", weight: "500", style: "normal" },
    { path: "./fonts/nunito/Nunito-MediumItalic.woff", weight: "500", style: "italic" },
    { path: "./fonts/nunito/Nunito-SemiBold.woff", weight: "600", style: "normal" },
    { path: "./fonts/nunito/Nunito-SemiBoldItalic.woff", weight: "600", style: "italic" },
    { path: "./fonts/nunito/Nunito-Bold.woff", weight: "700", style: "normal" },
    { path: "./fonts/nunito/Nunito-BoldItalic.woff", weight: "700", style: "italic" },
    { path: "./fonts/nunito/Nunito-ExtraBold.woff", weight: "800", style: "normal" },
    { path: "./fonts/nunito/Nunito-ExtraBoldItalic.woff", weight: "800", style: "italic" },
    { path: "./fonts/nunito/Nunito-Black.woff", weight: "900", style: "normal" },
    { path: "./fonts/nunito/Nunito-BlackItalic.woff", weight: "900", style: "italic" },
  ],
  variable: "--font-nunito",
});

const openSans = localFont({
  src: [
    { path: "./fonts/opensans/OpenSans-Light.woff", weight: "300", style: "normal" },
    { path: "./fonts/opensans/OpenSans-LightItalic.woff", weight: "300", style: "italic" },
    { path: "./fonts/opensans/OpenSans-Regular.woff", weight: "400", style: "normal" },
    { path: "./fonts/opensans/OpenSans-Italic.woff", weight: "400", style: "italic" },
    { path: "./fonts/opensans/OpenSans-Medium.woff", weight: "500", style: "normal" },
    { path: "./fonts/opensans/OpenSans-MediumItalic.woff", weight: "500", style: "italic" },
    { path: "./fonts/opensans/OpenSans-SemiBold.woff", weight: "600", style: "normal" },
    { path: "./fonts/opensans/OpenSans-SemiBoldItalic.woff", weight: "600", style: "italic" },
    { path: "./fonts/opensans/OpenSans-Bold.woff", weight: "700", style: "normal" },
    { path: "./fonts/opensans/OpenSans-BoldItalic.woff", weight: "700", style: "italic" },
    { path: "./fonts/opensans/OpenSans-ExtraBold.woff", weight: "800", style: "normal" },
    { path: "./fonts/opensans/OpenSans-ExtraBoldItalic.woff", weight: "800", style: "italic" },
  ],
  variable: "--font-open-sans",
});

const roboto = localFont({
  src: [
    { path: "./fonts/roboto/Roboto-Thin.woff", weight: "100", style: "normal" },
    { path: "./fonts/roboto/Roboto-ThinItalic.woff", weight: "100", style: "italic" },
    { path: "./fonts/roboto/Roboto-Light.woff", weight: "300", style: "normal" },
    { path: "./fonts/roboto/Roboto-LightItalic.woff", weight: "300", style: "italic" },
    { path: "./fonts/roboto/Roboto-Regular.woff", weight: "400", style: "normal" },
    { path: "./fonts/roboto/Roboto-Italic.woff", weight: "400", style: "italic" },
    { path: "./fonts/roboto/Roboto-Medium.woff", weight: "500", style: "normal" },
    { path: "./fonts/roboto/Roboto-MediumItalic.woff", weight: "500", style: "italic" },
    { path: "./fonts/roboto/Roboto-Bold.woff", weight: "700", style: "normal" },
    { path: "./fonts/roboto/Roboto-BoldItalic.woff", weight: "700", style: "italic" },
    { path: "./fonts/roboto/Roboto-Black.woff", weight: "900", style: "normal" },
    { path: "./fonts/roboto/Roboto-BlackItalic.woff", weight: "900", style: "italic" },
  ],
  variable: "--font-roboto",
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
      <body
        className={`${nunito.variable} ${openSans.variable} ${roboto.variable} ${geistMono.variable}`}
        style={{
          backgroundColor: "var(--bg, #ffffff)",
          color: "var(--ink, #151827)",
        }}
      >
        <AppProvider>
          <div className="app-layout">
            {children}
            <Footer />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
