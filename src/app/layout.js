import "./globals.css";

export const metadata = {
  title: {
    default: "Silver Red Store — Silverbyte Studio",
    template: "%s | Silverbyte Studio App Store",
  },
  description: "A personal Apps and Games store by Silverbyte Studio.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://silverbytestudio.com"),
  openGraph: {
    type: "website",
    siteName: "Silverbyte Studio App Store",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#2b1f1a" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
