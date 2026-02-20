import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Spork'd — Discover Local Food Trucks & Pop-ups",
  description: "Find the best food trucks, pop-up bars, and local vendors near you. Rate, review, and favorite your favorites.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#ff5722",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              className: "!rounded-xl !shadow-card",
              duration: 3000,
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
