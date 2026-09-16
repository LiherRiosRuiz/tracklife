import type { Metadata, Viewport } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { PWARegister } from "@/components/PWARegister";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://app.tracklife.test";
const TITLE = "TRACKLIFE — Control total de tu transformación física";
const DESCRIPTION = "Nutrición, entrenamiento, biométricos y comunidad en una sola plataforma.";

export const metadata: Metadata = {
  // Without metadataBase, relative OG image paths don't resolve to absolute URLs
  // and the card silently renders without an image.
  metadataBase: new URL(APP_URL),
  title: TITLE,
  description: DESCRIPTION,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TRACKLIFE" },
  // The landing had these; the app had none, so sharing a link to /login or
  // /registro anywhere (WhatsApp, Twitter, Slack) produced a bare URL with no
  // preview card. Pages that set their own title/description inherit the rest.
  openGraph: {
    type: "website",
    siteName: "TRACKLIFE",
    title: TITLE,
    description: DESCRIPTION,
    url: APP_URL,
    locale: "es_ES",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "TRACKLIFE" }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#090c0a",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${sora.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
        <PWARegister />
      </body>
    </html>
  );
}
