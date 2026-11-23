import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/dm-serif-display/latin-400-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaveCircle — Save together. Grow with trust.",
  description: "Transparent group savings and rotating payouts, built on Stellar.",
  icons: { icon: "/savecircle-icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
