import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { MotionProvider } from "@/components/motion/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Faqat "latin" to'plami: o'zbekcha ʻ (U+02BB) ham shu yerda — latin-ext keraksiz yuklanmasin
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Kamdan-kam ishlatiladi (kalit, kod) — oldindan yuklanmaydi
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

// Sarlavhalar va katta raqamlar; opsz — katta o'lchamda nozikroq, kichikda mustahkamroq shakl. Kursiv ishlatilmaydi.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

// viewportFit — telefonda pastki panel ekran chetidagi xavfsiz hududni hisobga olishi uchun
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#15120e" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Hisob — shaxsiy moliya",
    template: "%s · Hisob",
  },
  description: "Kirim-chiqim, budjet va qarzlarni nazorat qilish tizimi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <MotionProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </MotionProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
