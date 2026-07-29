import { defineTranslations } from "fumadocs-core/i18n"
import { i18nProvider, uiTranslations } from "fumadocs-ui/i18n"
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

import { LogoIcon } from "@/components/icons"

export const translations = defineTranslations().extend(uiTranslations()).add({
  "Back to Home(404 not found page)": "返回首页",
  "Choose a language(language switcher)": "选择语言",
  "Close Search(search dialog)(aria-label)": "关闭搜索",
  "Close Sidebar(aria-label)": "关闭侧边栏",
  "Collapse Sidebar(sidebar)(aria-label)": "收起侧边栏",
  "Copy Markdown(page actions)": "复制 Markdown",
  "Dark(theme switcher)(aria-label)": "深色",
  "Hide Sidebar(sidebar)": "隐藏侧边栏",
  "Light(theme switcher)(aria-label)": "浅色",
  "Next Page(pagination)": "下一页",
  "No Headings(table of contents)": "本页没有标题",
  "No results found(search dialog)": "没有找到结果",
  "On this page(table of contents)": "本页目录",
  "Open Search(search trigger)(aria-label)": "打开搜索",
  "Open Sidebar(aria-label)": "打开侧边栏",
  "Page Not Found(404 not found page)": "页面未找到",
  "Previous Page(pagination)": "上一页",
  "Search(search dialog)": "搜索",
  "Search(search trigger)": "搜索",
  "Show Sidebar(sidebar)": "显示侧边栏",
  "System(theme switcher)(aria-label)": "跟随系统",
  "Table of Contents(inline table of contents)": "目录",
  "Toggle Theme(theme switcher)(aria-label)": "切换主题",
  "View as Markdown(page actions)": "查看 Markdown",
})

export const docsI18n = i18nProvider(translations)

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <LogoIcon className="size-6" />
          <span className="font-medium">FGC Library 文档</span>
        </>
      ),
      url: "/docs",
    },
  }
}
