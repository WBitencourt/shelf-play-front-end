import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider, useMessages } from "next-intl";

interface RootLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
  params: { locale },
}: Readonly<RootLayoutProps>) {
  const messages = useMessages();
  
  return (
    <html lang="en">
      <body
        className={`${interSans.variable} antialiased bg-white dark:bg-black text-zinc-800 dark:text-zinc-100 overflow-hidden`}
      >
        <NextIntlClientProvider 
          locale={locale} 
          messages={messages}
        >
          {children}
        </NextIntlClientProvider>
        {/* <Toaster 
          expand
          richColors
          position="bottom-left" 
          toastOptions={{}}
        /> */}
      </body>
    </html>
  );
}
