#!/usr/bin/env node
/**
 * 把站点上选定的文档导出成一本 PDF 手册（命令行入口）。
 *
 * 这是本地工具，不参与站点构建，也不修改站点代码与样式：
 * 它从运行中的站点抓取页面 HTML，在浏览器里拼成一本文档后打印成 PDF。
 *
 * 需要图形界面时用 `pnpm manual:studio`，两者共用 scripts/lib/manual-core.mjs。
 *
 * 用法示例：
 *   node scripts/export-manual.mjs solutions/offline-form --title "HAC 离线填报手册"
 *   node scripts/export-manual.mjs standards/arch standards/dev/base --out manuals/标准化.pdf
 *   node scripts/export-manual.mjs --list
 *
 * 前置条件：本地站点已启动（默认 http://localhost:3000，可用 --base-url 覆盖）。
 */
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import {
  createRenderer,
  DEFAULT_BASE_URL,
  deriveTitle,
  loadSiteIndex,
  resolveChapters,
  safeFileName,
  toSlug,
} from "./lib/manual-core.mjs"

const HELP = `
把站点上选定的文档导出为一本 PDF 手册。

用法：
  node scripts/export-manual.mjs <文档路径...> [选项]

文档路径（可多个，按给出顺序排入手册）：
  可以是模块、目录或单页，例如 solutions/offline-form、standards/arch、standards/arch/deployment。
  选中目录时，其下所有页面按站点侧边栏顺序一并导出。

选项：
  --title <文本>       手册标题（默认按所选文档推导）
  --subtitle <文本>    封面副标题
  --version <文本>     封面左下显示的版本，如 v1.0
  --note <文本>        封面左下附带的一行说明，如「内部资料，请勿外传」
  --logo <路径|网址>   封面右上 logo；默认 GrapeCity 标识
  --no-logo            去掉封面 logo
  --logo-width <长度>  logo 宽度（默认 42mm，可写 40px 等）
  --cover-bg <路径|网址>  封面背景图，铺满整页
  --cover-bg-opacity <0-1> 背景图不透明度，用于把背景调淡
  --cover-theme <light|dark|auto>  封面文字配色（默认 auto：按背景图亮度判断）
  --font-title <尺寸>     主标题字号（默认 36pt）
  --font-subtitle <尺寸>  副标题字号（默认 12pt）
  --font-meta <尺寸>      信息区（版本/日期/备注）字号（默认 14px）
                          尺寸可写 36pt、48px，只写数字时按 pt
  --logo-top <位置>       logo 距页面顶部的距离（默认 5.4%）
  --title-top <位置>      主标题块距页面顶部的距离（默认 30%）
  --meta-top <位置>       信息区距页面顶部的距离（默认 92%）
                          位置可写 28%、90mm，只写数字时按 %；
                          不做范围限制，可按需要自行摆放
  --out <路径>         输出文件（默认 manuals/<标题>-<日期>.pdf）
  --base-url <地址>    站点地址（默认 ${DEFAULT_BASE_URL}）
  --site-url <地址>    把文档内指向站点的链接改写成该地址；不填则去掉链接只留文字
  --date <文本>        封面日期（默认今天，格式 YYYY-MM-DD）
  --no-toc             不生成目录页
  --list               列出站点上所有可导出的文档后退出
  -h, --help           显示本帮助

封面图片可以写本地文件路径（相对项目根目录，会内联进 PDF）、
站内路径（如 /assets/xxx.png，从运行中的站点读取）或 http(s) 网址。

示例：
  node scripts/export-manual.mjs solutions/offline-form
  node scripts/export-manual.mjs standards/arch --title "架构设计手册" --site-url https://fgclibrary.cn
  node scripts/export-manual.mjs standards/arch --version v1.0 --note "内部资料，请勿外传"
  node scripts/export-manual.mjs standards/arch --cover-bg public/images/cover.png --cover-bg-opacity 0.25
`

function fail(message) {
  process.stderr.write(`错误：${message}\n`)
  process.exit(1)
}

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    siteUrl: "",
    title: "",
    subtitle: "",
    version: "",
    note: "",
    logo: undefined,
    showLogo: true,
    logoWidth: "",
    coverBg: "",
    coverBgOpacity: "",
    coverTheme: "auto",
    fontSizeTitle: "",
    fontSizeSubtitle: "",
    fontSizeMeta: "",
    positionLogo: "",
    positionTitle: "",
    positionMeta: "",
    out: "",
    date: new Date().toISOString().slice(0, 10),
    toc: true,
    list: false,
  }
  const selections = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => {
      const value = argv[++i]
      if (value === undefined) {
        fail(`参数 ${arg} 缺少取值`)
      }
      return value
    }

    if (arg === "-h" || arg === "--help") {
      process.stdout.write(HELP)
      process.exit(0)
    } else if (arg === "--list") {
      options.list = true
    } else if (arg === "--no-toc") {
      options.toc = false
    } else if (arg === "--version") {
      options.version = next()
    } else if (arg === "--note") {
      options.note = next()
    } else if (arg === "--logo") {
      options.logo = next()
    } else if (arg === "--no-logo") {
      options.showLogo = false
    } else if (arg === "--logo-width") {
      options.logoWidth = next()
    } else if (arg === "--cover-bg") {
      options.coverBg = next()
    } else if (arg === "--cover-bg-opacity") {
      options.coverBgOpacity = next()
    } else if (arg === "--cover-theme") {
      const value = next()
      if (!["light", "dark", "auto"].includes(value)) {
        fail(`--cover-theme 只能是 light、dark 或 auto，收到“${value}”`)
      }
      options.coverTheme = value
    } else if (arg === "--font-title") {
      options.fontSizeTitle = next()
    } else if (arg === "--font-subtitle") {
      options.fontSizeSubtitle = next()
    } else if (arg === "--font-meta") {
      options.fontSizeMeta = next()
    } else if (arg === "--logo-top") {
      options.positionLogo = next()
    } else if (arg === "--title-top") {
      options.positionTitle = next()
    } else if (arg === "--meta-top") {
      options.positionMeta = next()
    } else if (arg === "--title") {
      options.title = next()
    } else if (arg === "--subtitle") {
      options.subtitle = next()
    } else if (arg === "--out") {
      options.out = next()
    } else if (arg === "--base-url") {
      options.baseUrl = next()
    } else if (arg === "--site-url") {
      options.siteUrl = next()
    } else if (arg === "--date") {
      options.date = next()
    } else if (arg.startsWith("-")) {
      fail(`未知参数 ${arg}（用 --help 查看用法）`)
    } else {
      selections.push(arg)
    }
  }

  options.baseUrl = options.baseUrl.replace(/\/+$/, "")
  options.siteUrl = options.siteUrl.replace(/\/+$/, "")
  return { options, selections }
}

async function main() {
  const { options, selections } = parseArgs(process.argv.slice(2))

  const nodes = await loadSiteIndex(options.baseUrl)

  if (options.list) {
    for (const node of nodes) {
      if (node.kind !== "page") {
        continue
      }
      process.stdout.write(`${"  ".repeat(node.depth)}${toSlug(node.url)}\n`)
    }
    return
  }

  if (selections.length === 0) {
    process.stderr.write(HELP)
    fail("请至少指定一个文档路径")
  }

  const chapters = resolveChapters(nodes, selections)
  const title = options.title || deriveTitle(chapters)
  const outPath = path.resolve(
    options.out ||
      path.join("manuals", `${safeFileName(title)}-${options.date}.pdf`),
  )

  const renderer = createRenderer()
  process.stdout.write(`浏览器：${renderer.browserPath}\n`)
  process.stdout.write(`手册：${title}（${chapters.length} 篇文档）\n`)

  try {
    const buffer = await renderer.render(
      {
        baseUrl: options.baseUrl,
        chapters,
        title,
        subtitle: options.subtitle,
        date: options.date,
        toc: options.toc,
        siteUrl: options.siteUrl,
        cover: {
          version: options.version,
          note: options.note,
          showLogo: options.showLogo,
          logo: options.logo,
          logoWidth: options.logoWidth,
          background: options.coverBg,
          backgroundOpacity: options.coverBgOpacity,
          theme: options.coverTheme,
          fontSize: {
            title: options.fontSizeTitle,
            subtitle: options.fontSizeSubtitle,
            meta: options.fontSizeMeta,
          },
          position: {
            logo: options.positionLogo,
            title: options.positionTitle,
            meta: options.positionMeta,
          },
        },
      },
      ({ phase, index, total, title: chapterTitle, coverTheme }) => {
        if (phase === "fetch") {
          process.stdout.write(
            `  [${String(index).padStart(2, " ")}/${total}] ${chapterTitle}\n`,
          )
        } else if (coverTheme && options.coverTheme === "auto") {
          // 说明自动配色判断的结果，便于核对；显式指定时无需赘述。
          process.stdout.write(
            `封面配色：${coverTheme === "dark" ? "深色背景（浅色文字）" : "浅色背景（深色文字）"}\n`,
          )
        }
      },
    )

    await mkdir(path.dirname(outPath), { recursive: true })
    await writeFile(outPath, buffer)

    const size = (buffer.length / 1024 / 1024).toFixed(1)
    process.stdout.write(`\n已导出：${outPath}（${size} MB）\n`)
  } finally {
    await renderer.close()
  }
}

try {
  await main()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
