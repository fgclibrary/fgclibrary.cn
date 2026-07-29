import { RootProvider } from "fumadocs-ui/provider/next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import { docsI18n } from "@/lib/layout.shared"

import "./globals.css"

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
