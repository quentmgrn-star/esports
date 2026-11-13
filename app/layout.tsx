import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

const vietnam = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Esade Sports",
  description: "Teams, fixtures, try-outs and alumni of Esade Sports, the student sports association of Esade.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={vietnam.variable}>
      <body style={{ margin: 0 }}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
