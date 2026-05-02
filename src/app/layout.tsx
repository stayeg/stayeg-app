import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Providers } from "@/components/layout/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#1D4ED8",
};

const SITE_URL = "https://stayeg.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "StayEg — India's #1 Smart PG Platform | Find Verified PGs, Pay Zero Brokerage",
    template: "%s | StayEg",
  },
  description:
    "StayEg is India's most trusted paying guest (PG) platform. Browse 10,000+ verified PGs across 20+ cities. Book instantly with zero brokerage, manage rent digitally, join local communities, and experience hassle-free PG living. Trusted by 50,000+ tenants across Bangalore, Delhi, Mumbai, Pune, Hyderabad & more.",
  keywords: [
    "PG near me",
    "paying guest accommodation",
    "PG in Bangalore",
    "PG in Delhi",
    "PG in Mumbai",
    "PG in Pune",
    "PG in Hyderabad",
    "PG in Chennai",
    "boys PG",
    "girls PG",
    "unisex PG",
    "PG booking online",
    "PG without brokerage",
    "PG management software",
    "PG owner app",
    "paying guest India",
    "student accommodation",
    "shared rooms India",
    "hostel alternative",
    "PG rent",
    "monthly PG",
    "PG with food",
    "AC PG",
    "PG near metro",
    "PG near IT park",
    "co-living India",
    "room on rent",
    "StayEg",
    "best PG platform India",
  ],
  authors: [{ name: "StayEg", url: SITE_URL }],
  creator: "StayEg",
  publisher: "StayEg Technologies Pvt. Ltd.",
  category: "Real Estate & Accommodation",
  openGraph: {
    title: "StayEg — India's Smartest PG Ecosystem",
    description:
      "Find your perfect PG home in minutes. 10,000+ verified properties, zero brokerage, instant booking across 20+ Indian cities.",
    siteName: "StayEg",
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StayEg — India's Most Trusted PG Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StayEg — India's Smart PG Platform",
    description:
      "Verified PGs, zero brokerage, instant booking. Find your perfect PG home today!",
    images: ["/og-image.png"],
    creator: "@stayeg",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", sizes: "180x180" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StayEg",
    startupImage: "/icon.svg",
  },
  verification: {
    google: "",
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "StayEg",
      legalName: "StayEg Technologies Pvt. Ltd.",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.svg`,
        width: 200,
        height: 200,
      },
      description:
        "India's most trusted paying guest (PG) platform connecting 50,000+ tenants with 10,000+ verified PGs across 20+ cities.",
      foundingDate: "2024",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bangalore",
        addressRegion: "Karnataka",
        postalCode: "560001",
        addressCountry: "IN",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@stayeg.com",
        telephone: "+91-80-1234-5678",
        availableLanguage: ["English", "Hindi"],
      },
      sameAs: [
        "https://twitter.com/stayeg",
        "https://instagram.com/stayeg",
        "https://linkedin.com/company/stayeg",
        "https://facebook.com/stayeg",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "StayEg",
      description:
        "India's #1 Smart PG Platform — Find, book, and manage verified paying guest accommodations with zero brokerage.",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
