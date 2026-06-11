import {ClerkProvider} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Space_Mono } from "next/font/google";
import { CartProvider } from "@/components/cart-context";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display"
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body"
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Influencer Outreach Solutions Dashboard",
  description: "Client dashboard prototype for orders, delivery status, and invoices."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <ClerkProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}