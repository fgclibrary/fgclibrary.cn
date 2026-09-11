import { RootProvider } from "fumadocs-ui/provider/next"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { docsI18n } from "@/lib/layout.shared"

import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://fgclibrary.cn"),
  applicationName: "格言格语",
  title: {
    default: "格言格语",
    template: "%s | 格言格语",
  },
  description: "沉淀活字格开发中的工程经验、可复用方案与产品集成实践。",
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
      className={`${geist.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider
          theme={{
            attribute: "class",
            defaultTheme: "system",
            enableSystem: true,
            disableTransitionOnChange: true,
          }}
          // 静态导出下没有搜索服务端接口，改为加载构建期生成的
          // 索引文件（/api/search）在浏览器端本地检索。
          search={{ options: { type: "static" } }}
          i18n={docsI18n}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
