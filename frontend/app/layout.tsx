import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { WalletAuthProvider } from "@/providers/WalletAuthProvider";
import { KeyPairAuthProvider } from "@/providers/KeyPairAuthProvider";
import Header from "@/components/Header";
import "./globals.css";
import { WagmiProvider } from "@/providers/WagmiProvider";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export const fetchCache = 'default-cache'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${inter.className} h-full`}>
        <WagmiProvider>
          <ReactQueryProvider>
            <KeyPairAuthProvider>
              <WalletAuthProvider>
                <main className="container mx-auto p-4 space-y-6 h-full flex flex-col">
                  <Header />
                  <div className="grow flex flex-col">
                    {children}
                  </div>
                </main>
                <Toaster />
              </WalletAuthProvider>
            </KeyPairAuthProvider>
          </ReactQueryProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
