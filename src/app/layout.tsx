import { Inter } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import "~/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Tykon - Type Racing Game",
  description: "Test and improve your typing speed with Tykon",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable}`}>
        <TRPCReactProvider>
          <div className="min-h-screen bg-white">
            <main>{children}</main>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
