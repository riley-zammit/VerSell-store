import type { Metadata } from "next";
import { Aleo, Geist } from "next/font/google";
import { Suspense } from "react";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import { AgentContextProvider } from "@/components/chat/agent-provider";
import { ChatWindow, ChatWindowWithPathname } from "@/components/chat/chat-window";
import { ChatWindowContextProvider } from "@/components/chat/chat-window-provider";
import { Footer } from "@/components/layout/root/footer";
import { Header } from "@/components/layout/root/header";
import { getCart } from "@/lib/cart";
import { siteOpenGraph } from "@/lib/metadata";
import type { Cart } from "@/lib/types";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const aleo = Aleo({
    variable: "--font-aleo",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL(
        process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : "http://localhost:3000",
    ),
    title: { default: 'Versell', template: "%s | Versell" },
    description: "Official Vercel swag: bottles, mugs, tees, hoodies and more.",
    // The image comes from app/opengraph-image.png. Pages that don't set openGraph inherit it.
    openGraph: siteOpenGraph,
    twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    // Initial value for cart/loads on hard loads that clear client state
    const initialCart: Promise<Cart> = getCart();

    return (
        <html lang="en" className={`${geistSans.variable} ${aleo.variable} h-full antialiased`}>
            <body className="flex min-h-full flex-col font-sans">
                <CartProvider initialCart={initialCart}>
                    <AgentContextProvider>
                        <ChatWindowContextProvider>
                            <Header />
                            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 font-serif">{children}</main>
                            <Footer />
                            <CartDrawer />
                            <Suspense fallback={<ChatWindow />}>
                                <ChatWindowWithPathname />
                            </Suspense>
                        </ChatWindowContextProvider>
                    </AgentContextProvider>
                </CartProvider>
            </body>
        </html>
    );
}
