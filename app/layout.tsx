import type { Metadata } from "next";
import { Aleo, Geist } from "next/font/google";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import { Footer } from "@/components/layout/root/footer";
import { Header } from "@/components/layout/root/header";
import { getCart } from "@/lib/cart";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const aleo = Aleo({
  variable: "--font-aleo",
  subsets: ["latin"],
});

const description = "Official Vercel swag: bottles, mugs, tees, hoodies and more.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: { default: 'Versell', template: "%s | Versell" },
  description,
  openGraph: { siteName: 'Versell', type: "website", locale: "en_US", description },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${aleo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {/* Not awaited: the cookie read resolves inside each cart view's Suspense, so the shell still prerenders. */}
        <CartProvider cart={getCart()}>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 font-serif">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
