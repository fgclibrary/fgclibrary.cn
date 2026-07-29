import { RootProvider } from "fumadocs-ui/provider/next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import { docsI18n } from "@/lib/layout.shared"

import "./globals.css"

export const metadata: Metadata = {
  applicationName: "格言格语",
  title: {
    default: "格言格语",
    template: "%s | 格言格语",
  },
  description: "格言格语项目网站",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider
          theme={{
            attribute: "class",
            defaultTheme: "system",
            enableSystem: true,
            disableTransitionOnChange: true,
          }}
          i18n={docsI18n}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
