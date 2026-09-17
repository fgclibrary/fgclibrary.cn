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
  --title <文本>     手册标题（默认按所选文档推导）
  --subtitle <文本>  封面副标题
  --out <路径>       输出文件（默认 manuals/<标题>-<日期>.pdf）
  --base-url <地址>  站点地址（默认 ${DEFAULT_BASE_URL}）
  --site-url <地址>  把文档内指向站点的链接改写成该地址；不填则去掉链接只留文字
  --date <文本>      封面日期（默认今天，格式 YYYY-MM-DD）
  --no-toc           不生成目录页
  --list             列出站点上所有可导出的文档后退出
  -h, --help         显示本帮助

示例：
  node scripts/export-manual.mjs solutions/offline-form
  node scripts/export-manual.mjs standards/arch --title "架构设计手册" --site-url https://fgclibrary.cn
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
      },
      ({ phase, index, total, title: chapterTitle }) => {
        if (phase === "fetch") {
          process.stdout.write(
            `  [${String(index).padStart(2, " ")}/${total}] ${chapterTitle}\n`,
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
