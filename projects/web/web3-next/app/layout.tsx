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

export const metadata: Metadata = {
  title: "TRACKLIFE — Control total de tu transformación física",
  description: "Nutrición, entrenamiento, biométricos y comunidad en una sola plataforma.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TRACKLIFE" },
};

export const viewport: Viewport = {
  themeColor: "#0c1311",
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
