/**
 * PDF 手册导出的核心逻辑。
 *
 * 被两个入口共用：
 *   - scripts/export-manual.mjs  命令行
 *   - scripts/manual-studio.mjs  本地界面
 *
 * 与站点无关的边界：本模块只读取运行中的站点，不修改站点代码与样式。
 */

import { existsSync } from "node:fs"
import puppeteer from "puppeteer-core"

export const DEFAULT_BASE_URL = "http://localhost:3000"

export const SITE_NAME = "格言格语"
export const SITE_TAGLINE =
  "沉淀活字格开发中的工程经验、可复用方案与产品集成实践"

/** 常见的 Chromium 内核浏览器，按优先级查找，避免额外下载一份 Chromium。 */
const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean)

/** 把文档路径归一化成 slug，如 /docs/solutions/rbac -> solutions/rbac */
export function toSlug(url) {
  return url
    .replace(/^\/+/, "")
    .replace(/^docs\/?/, "")
    .replace(/\/+$/, "")
}

/**
 * 解析站点 /llms.txt 的页面索引。
 * 该索引由 fumadocs 依据 meta.json 生成，顺序与侧边栏一致，
 * 并且包含由 OpenAPI 生成、在 content/docs 下并不存在的 API 页面。
 */
export function parsePageIndex(text) {
  const nodes = []

  for (const line of text.split("\n")) {
    const match = /^(\s*)- (.+)$/.exec(line)
    if (!match) {
      continue
    }

    const title = match[2].trim()
    if (!title) {
      continue
    }

    // 缩进两格一层，与 llms.txt 的层级约定一致。
    const depth = Math.floor(match[1].length / 2)
    const link = /^\[([^\]]+)\]\(([^)]+)\)/.exec(title)

    if (link) {
      // 描述写在链接之后，形如 “- [标题](url): 描述”，一并保留：
      // 界面用它做搜索与提示。
      const description = title
        .slice(link[0].length)
        .replace(/^:\s*/, "")
        .trim()
      nodes.push({
        depth,
        kind: "page",
        title: link[1],
        url: link[2],
        description,
      })
      continue
    }

    const bold = /^\*\*(.+?)\*\*$/.exec(title)
    nodes.push({
      depth,
      // **加粗** 是 meta.json 里的分隔线，普通文本行是目录分组标题。
      kind: bold ? "separator" : "group",
      title: bold ? bold[1] : title.replace(/:\s.*$/, ""),
      url: "",
    })
  }

  return nodes.map((node, index) => ({ ...node, index }))
}

/** 取某节点的祖先分组链，用于生成目录层级与推导手册标题。 */
export function ancestorsOf(nodes, node) {
  const chain = []
  let depth = node.depth

  for (let i = node.index - 1; i >= 0; i--) {
    if (nodes[i].depth < depth) {
      chain.unshift(nodes[i])
      depth = nodes[i].depth
    }
  }

  return chain
}

/**
 * 把扁平索引转成界面用的树。
 * 分组节点带 descendants，便于“勾选整章”一次性取到其下全部页面。
 */
export function buildTree(nodes) {
  const root = { kind: "root", title: "全部文档", children: [] }
  const stack = [root]

  for (const node of nodes) {
    const parent = stack[node.depth]
    if (!parent) {
      continue
    }

    const item = {
      kind: node.kind,
      title: node.title,
      description: node.description ?? "",
      url: node.url,
      slug: node.kind === "page" ? toSlug(node.url) : "",
      children: [],
    }
    parent.children.push(item)
    stack[node.depth + 1] = item
    stack.length = node.depth + 2
  }

  const collect = (item) => {
    item.descendants = []
    for (const child of item.children) {
      if (child.kind === "page") {
        item.descendants.push(child.slug)
      } else {
        collect(child)
        item.descendants.push(...child.descendants)
      }
    }
    return item.descendants
  }

  for (const child of root.children) {
    if (child.kind !== "page") {
      collect(child)
    }
  }

  return root
}

export function matchPages(nodes, selection) {
  const slug = toSlug(selection)
  if (!slug) {
    return nodes.filter((node) => node.kind === "page")
  }

  return nodes.filter(
    (node) =>
      node.kind === "page" &&
      (toSlug(node.url) === slug || toSlug(node.url).startsWith(`${slug}/`)),
  )
}

/** 找出与选择最接近的已有文档，便于给出可操作的报错。 */
export function suggestSlugs(nodes, selection) {
  const head = toSlug(selection).split("/")[0]
  const candidates = nodes
    .filter((node) => node.kind === "page")
    .map((node) => toSlug(node.url))
    .filter((slug) => slug.startsWith(head))

  return [
    ...new Set(candidates.map((slug) => slug.split("/").slice(0, 2).join("/"))),
  ]
    .slice(0, 8)
    .join("、")
}

function chaptersFrom(nodes, pageNodes) {
  return pageNodes.map((node) => ({
    node,
    ancestors: ancestorsOf(nodes, node),
  }))
}

/**
 * 命令行用法：选择项可以是模块、目录或单页，目录按站点侧边栏顺序展开。
 */
export function resolveChapters(nodes, selections) {
  const picked = []
  const seen = new Set()

  for (const selection of selections) {
    const matched = matchPages(nodes, selection)
    if (matched.length === 0) {
      const suggestion = suggestSlugs(nodes, selection)
      throw new Error(
        `找不到文档“${selection}”。` +
          (suggestion
            ? `可能想要的是：${suggestion}`
            : "可用 --list 查看全部文档。"),
      )
    }

    for (const node of matched) {
      if (seen.has(node.url)) {
        continue
      }
      seen.add(node.url)
      picked.push(node)
    }
  }

  return chaptersFrom(nodes, picked)
}

/**
 * 界面用法：直接给出排好序的 slug 列表，完全尊重用户选择与顺序。
 *
 * 注意：文档首页（/docs）的 slug 是空字符串，不能被当作“空值”过滤掉，
 * 否则用户勾了这一篇却会静默消失。
 */
export function resolveChaptersBySlugs(nodes, slugs) {
  const bySlug = new Map()
  for (const node of nodes) {
    if (node.kind === "page") {
      bySlug.set(toSlug(node.url), node)
    }
  }

  const picked = []
  const unknown = []
  for (const slug of slugs) {
    if (typeof slug !== "string") {
      continue
    }
    const node = bySlug.get(toSlug(slug))
    if (node) {
      picked.push(node)
    } else {
      unknown.push(slug)
    }
  }

  if (unknown.length > 0) {
    throw new Error(`找不到文档：${unknown.join("、")}`)
  }

  return chaptersFrom(nodes, picked)
}

/** 未显式指定标题时，按所选文档推导，如 “HAC 离线填报手册”。 */
export function deriveTitle(chapters) {
  if (chapters.length === 0) {
    return "文档手册"
  }
  if (chapters.length === 1) {
    return `${chapters[0].node.title}手册`
  }

  const [first, ...rest] = chapters
  const common = first.ancestors.filter((ancestor, i) =>
    rest.every((chapter) => chapter.ancestors[i]?.title === ancestor.title),
  )
  const label = common.at(-1)?.title ?? first.ancestors.at(-1)?.title

  return label ? `${label}手册` : "文档手册"
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function buildTableOfContents(chapters) {
  const baseDepth = Math.min(...chapters.map((chapter) => chapter.node.depth))
  const rows = []
  let previous = []

  chapters.forEach((chapter, i) => {
    const chain = chapter.ancestors.filter((node) => node.kind !== "page")
    const shared = chain.findLastIndex(
      (node, k) => previous[k]?.title === node.title,
    )

    chain.forEach((node, k) => {
      if (k <= shared) {
        return
      }
      const level = Math.max(0, node.depth - baseDepth)
      rows.push(
        `<li class="export-toc__group" style="--level:${level}">${escapeHtml(node.title)}</li>`,
      )
    })

    const level = Math.max(0, chapter.node.depth - baseDepth)
    rows.push(
      `<li class="export-toc__item" style="--level:${level}">` +
        `<a href="#chapter-${i + 1}">` +
        `<span class="export-toc__num">${i + 1}</span>` +
        `<span class="export-toc__label">${escapeHtml(chapter.node.title)}</span>` +
        `</a></li>`,
    )
    previous = chain
  })

  return `<section class="export-toc">
  <h1 class="export-toc__heading">目录</h1>
  <ul class="export-toc__list">
${rows.join("\n")}
  </ul>
</section>`
}

function buildCover({ title, subtitle, date, count }) {
  return `<section class="export-cover">
  <div class="export-cover__brand">
    <span class="export-cover__brand-name">${escapeHtml(SITE_NAME)}</span>
    <span class="export-cover__brand-tagline">${escapeHtml(SITE_TAGLINE)}</span>
  </div>
  <div class="export-cover__main">
    <h1 class="export-cover__title">${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="export-cover__subtitle">${escapeHtml(subtitle)}</p>` : ""}
  </div>
  <div class="export-cover__meta">
    <span>共 ${count} 篇文档</span>
    <span>${escapeHtml(date)}</span>
  </div>
</section>`
}

/** 打印样式：只在导出的 PDF 里生效，站点本身不受影响。 */
const PRINT_CSS = `
@media print {
  html, body {
    background: #fff !important;
    color-scheme: light only !important;
  }

  body {
    display: block !important;
    min-height: 0 !important;
    margin: 0 !important;
  }

  #export-root {
    font-family: var(--font-geist-sans), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;
    color: #18181b;
  }

  /* 封面、目录、每篇文档各占新的一页 */
  .export-cover { break-after: page; }
  .export-toc { break-after: page; }
  .export-chapter { break-before: page; }

  /* 站点上的交互元素在纸面上没有意义 */
  .export-chapter button,
  .export-chapter [aria-label*="Copy"],
  .export-chapter [aria-label*="复制"],
  .export-chapter div:has(> input[data-object-search-input]) {
    display: none !important;
  }

  /* 代码块默认限高并横向滚动，打印时必须放开，否则内容会被裁掉 */
  .export-chapter [role="region"],
  .export-chapter .fd-scroll-container {
    max-height: none !important;
    overflow: visible !important;
  }

  .export-chapter pre {
    min-width: 0 !important;
    width: auto !important;
    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
  }

  .export-chapter code {
    font-size: 11px !important;
  }

  .export-chapter img,
  .export-chapter svg {
    max-width: 100% !important;
    height: auto !important;
  }

  .export-chapter .prose {
    margin-bottom: 0 !important;
    max-width: none !important;
  }

  /* 避免标题落在页尾、表格行与图被拦腰截断 */
  .export-chapter h1,
  .export-chapter h2,
  .export-chapter h3,
  .export-chapter h4,
  .export-chapter h5 {
    break-after: avoid-page;
  }

  .export-chapter tr,
  .export-chapter figure,
  .export-chapter .fd-step,
  .export-chapter li {
    break-inside: avoid;
  }

  .export-chapter table {
    font-size: 12px !important;
  }

  .export-chapter a {
    color: inherit !important;
    text-decoration: none !important;
  }

  .export-chapter__eyebrow {
    font-size: 11px;
    letter-spacing: 0.08em;
    color: #71717a;
    margin-bottom: 0.75rem;
  }
}
`

/** 封面与目录的排版样式（仅导出时注入）。 */
const LAYOUT_CSS = `
#export-root { color: #18181b; }
#export-root * { box-sizing: border-box; }

.export-cover {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 60vh;
  padding: 24mm 0 12mm;
}
.export-cover__brand { display: flex; flex-direction: column; gap: 4px; }
.export-cover__brand-name { font-size: 20px; font-weight: 600; letter-spacing: 0.02em; }
.export-cover__brand-tagline { font-size: 12px; color: #71717a; }
.export-cover__main { display: flex; flex-direction: column; gap: 12px; }
.export-cover__title { font-size: 42px; font-weight: 700; line-height: 1.25; margin: 0; }
.export-cover__subtitle { font-size: 17px; color: #52525b; margin: 0; }
.export-cover__meta {
  display: flex;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid #d4d4d8;
  font-size: 12px;
  color: #71717a;
}

.export-toc__heading { font-size: 26px; font-weight: 700; margin: 0 0 20px; }
.export-toc__list { list-style: none; margin: 0; padding: 0; }
.export-toc__group {
  margin: 18px 0 6px;
  padding-left: calc(var(--level, 0) * 20px);
  font-size: 13px;
  font-weight: 600;
  color: #52525b;
}
.export-toc__item {
  padding-left: calc(var(--level, 0) * 20px);
  font-size: 14px;
  line-height: 2;
}
.export-toc__item a { display: inline-flex; gap: 8px; color: inherit; text-decoration: none; }
.export-toc__num { min-width: 1.6em; color: #a1a1aa; }

.export-chapter__inner {
  max-width: 900px;
  margin: 0 auto;
}
`

export function resolveBrowser() {
  const found = BROWSER_CANDIDATES.find((candidate) => existsSync(candidate))
  if (!found) {
    throw new Error(
      "找不到可用的 Chromium 内核浏览器。\n" +
        "请安装 Chrome 或 Edge，或用 CHROME_PATH 指定可执行文件路径。",
    )
  }
  return found
}

/**
 * 读取站点的页面索引。该索引由站点自身在构建期生成，
 * 因此比扫描 content/docs 目录更准：它包含 OpenAPI 生成的页面，
 * 并且顺序与侧边栏一致。
 */
export async function fetchPageIndex(baseUrl) {
  let response
  try {
    response = await fetch(`${baseUrl}/llms.txt`)
  } catch (error) {
    throw new Error(
      `无法访问站点 ${baseUrl}（${error.cause?.code ?? error.message}）。` +
        "请先启动本地开发服务：pnpm dev",
    )
  }

  if (!response.ok) {
    throw new Error(`读取 ${baseUrl}/llms.txt 失败：HTTP ${response.status}`)
  }

  return response.text()
}

/** 读取站点并解析出页面索引，界面与命令行共用。 */
export async function loadSiteIndex(baseUrl) {
  const text = await fetchPageIndex(baseUrl)
  return parsePageIndex(text)
}

/**
 * 抓取单个页面并清理成适合打印的 HTML。
 * 返回 #nd-page 的内容，并去掉面包屑、复制按钮、翻页卡片等网页专用的东西。
 */
async function extractPage(page, url, siteUrl) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 })
  await page.waitForSelector("#nd-page", { timeout: 120_000 })

  return page.evaluate((site) => {
    const source = document.querySelector("#nd-page")
    if (!source) {
      return ""
    }

    const clone = source.cloneNode(true)

    // 站点每页底部有“上一篇 / 下一篇”导航卡片，成册后由目录承担这个作用。
    // 两种形态都要覆盖：同时有上下篇时是 grid-cols-2，树中末页只有“上一篇”
    // 时是 grid-cols-1，只用 grid-cols-2 会漏掉后者。
    // 同时注意：OpenAPI 页面的正文容器也带 @container，必须靠“子元素都是
    // 带左右箭头的链接”来区分，否则会误删整页正文。
    for (const div of clone.querySelectorAll('div[class~="@container"]')) {
      const children = [...div.children]
      if (
        children.length === 0 ||
        !children.every((el) => el.tagName === "A")
      ) {
        continue
      }
      if (children.some((el) => el.querySelector('svg[class*="chevron-"]'))) {
        div.remove()
      }
    }

    // 正文若是从一级标题写起，会与页面标题重复（站点上也是两个），成册时去掉后者。
    const pageTitle = clone.querySelector(":scope > h1")?.textContent?.trim()
    const leadingHeading = clone.querySelector(".prose > h1, .prose > h2")
    if (
      pageTitle &&
      leadingHeading &&
      leadingHeading.textContent.replace(/\s+/g, "") ===
        pageTitle.replace(/\s+/g, "")
    ) {
      leadingHeading.remove()
    }

    // 去掉“复制 Markdown”一类的按钮；若其容器随之变空，一并移除。
    for (const button of clone.querySelectorAll("button")) {
      const label = `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`
      if (!/Copy|复制/i.test(label)) {
        continue
      }
      const parent = button.parentElement
      button.remove()
      if (
        parent &&
        parent !== clone &&
        parent.tagName === "DIV" &&
        !parent.querySelector("h1, h2, h3, h4, p, .prose, img, pre")
      ) {
        parent.remove()
      }
    }

    // 面包屑只对站内导航有意义。
    for (const div of clone.querySelectorAll(":scope > div")) {
      if (!div.matches("div.text-sm")) {
        continue
      }
      if (!div.querySelector("h1, h2, h3, .prose")) {
        div.remove()
      }
    }

    clone.querySelectorAll("*").forEach((element) => {
      element.removeAttribute("tabindex")
    })

    for (const img of clone.querySelectorAll("img")) {
      img.setAttribute("loading", "eager")
      const src = img.getAttribute("src")
      if (src?.startsWith("/")) {
        img.setAttribute("src", new URL(src, location.origin).href)
      }
      const srcset = img.getAttribute("srcset")
      if (srcset) {
        img.setAttribute(
          "srcset",
          srcset
            .split(",")
            .map((part) => {
              const [pathname, ...rest] = part.trim().split(/\s+/)
              const absolute = pathname.startsWith("/")
                ? new URL(pathname, location.origin).href
                : pathname
              return [absolute, ...rest].join(" ")
            })
            .join(", "),
        )
      }
    }

    for (const anchor of clone.querySelectorAll("a")) {
      const href = anchor.getAttribute("href") ?? ""
      if (href.startsWith("#")) {
        // 页内锚点在合并后的手册里会与其它章节的 id 冲突，退化成普通文字。
        anchor.removeAttribute("href")
      } else if (href.startsWith("/")) {
        if (site) {
          anchor.setAttribute("href", site + href)
        } else {
          anchor.removeAttribute("href")
        }
      }
      if (!anchor.hasAttribute("href")) {
        anchor.removeAttribute("data-card")
      }
    }

    return clone.innerHTML
  }, siteUrl)
}

/**
 * 渲染器：持有并复用同一个浏览器实例。
 *
 * 每次导出都重新启动浏览器会多花 1~2 秒，界面里频繁预览时值得复用；
 * 进程退出前应调用 close()。
 */
export function createRenderer() {
  let browserPromise = null

  const getBrowser = () => {
    if (!browserPromise) {
      browserPromise = puppeteer.launch({
        executablePath: resolveBrowser(),
        headless: true,
        // 单篇文档页数多时，页面内脚本可能跑得比较久。
        protocolTimeout: 180_000,
        args: ["--hide-scrollbars"],
      })
    }
    return browserPromise
  }

  return {
    browserPath: resolveBrowser,

    /**
     * 生成 PDF。
     * @param config baseUrl / chapters / title / subtitle / date / toc / siteUrl
     * @param onProgress 进度回调，用于界面显示当前进度
     * @returns {Promise<Buffer>}
     */
    async render(config, onProgress = () => {}) {
      const {
        baseUrl,
        chapters,
        title,
        subtitle = "",
        date,
        toc = true,
        siteUrl = "",
      } = config

      const browser = await getBrowser()
      const page = await browser.newPage()

      try {
        await page.setViewport({ width: 1280, height: 900 })
        // 手册以浅色呈现，避免抓到深色主题。
        await page.emulateMediaFeatures([
          { name: "prefers-color-scheme", value: "light" },
        ])

        const chapterParts = []
        for (const [i, chapter] of chapters.entries()) {
          onProgress({
            phase: "fetch",
            index: i + 1,
            total: chapters.length,
            title: chapter.node.title,
          })

          const url = new URL(chapter.node.url, baseUrl).href
          const html = await extractPage(page, url, siteUrl)
          chapterParts.push(`<section class="export-chapter" id="chapter-${i + 1}">
  <div class="export-chapter__inner">
    <div class="export-chapter__eyebrow">第 ${i + 1} 篇</div>
    ${html}
  </div>
</section>`)
        }

        onProgress({
          phase: "print",
          index: chapters.length,
          total: chapters.length,
        })

        const root = `${buildCover({
          title,
          subtitle,
          date,
          count: chapters.length,
        })}
${toc ? buildTableOfContents(chapters) : ""}
${chapterParts.join("\n")}`

        // 保留当前文档已加载的站点样式表，只替换 <body> 的内容，
        // 这样手册能沿用站点自身的排版，而无需复制或改动站点 CSS。
        await page.evaluate((html) => {
          document.documentElement.classList.remove("dark")
          document.body.className = ""
          document.body.innerHTML = `<div id="export-root">${html}</div>`
        }, root)
        await page.addStyleTag({ content: LAYOUT_CSS })
        await page.addStyleTag({ content: PRINT_CSS })

        await page.evaluate(async () => {
          await document.fonts.ready

          // 合并后的文档很长，懒加载的图片在视口外不会自行开始加载，
          // 这里统一改为立即加载，并带超时兜底，避免个别图片卡住整个导出。
          const images = [...document.images]
          for (const img of images) {
            img.loading = "eager"
          }
          await Promise.all(
            images.map(
              (img) =>
                new Promise((resolve) => {
                  if (img.complete) {
                    resolve()
                    return
                  }
                  const done = () => resolve()
                  img.addEventListener("load", done, { once: true })
                  img.addEventListener("error", done, { once: true })
                  setTimeout(done, 5000)
                }),
            ),
          )
        })

        const headerTemplate = `<div style="width:100%;padding:0 16mm;font-size:8px;color:#a1a1aa;font-family:'PingFang SC','Hiragino Sans GB',sans-serif;">
      <span>${escapeHtml(title)}</span>
    </div>`

        const footerTemplate = `<div style="width:100%;padding:0 16mm;font-size:8px;color:#a1a1aa;text-align:center;font-family:'PingFang SC','Hiragino Sans GB',sans-serif;">
      第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页
    </div>`

        // PDF 的标题取 document.title；Next.js 会在水合时改写它，
        // 所以放到打印前一刻设置。
        await page.evaluate((value) => {
          document.title = value
        }, title)

        return await page.pdf({
          format: "A4",
          printBackground: true,
          // 让 Chrome 依据标题生成 PDF 书签，便于在阅读器里跳转。
          outline: true,
          tagged: true,
          displayHeaderFooter: true,
          headerTemplate,
          footerTemplate,
          margin: {
            top: "20mm",
            bottom: "18mm",
            left: "16mm",
            right: "16mm",
          },
        })
      } finally {
        await page.close()
      }
    },

    async close() {
      if (!browserPromise) {
        return
      }
      const browser = await browserPromise.catch(() => null)
      browserPromise = null
      await browser?.close()
    },
  }
}

/** 文件名安全化，用于默认的输出文件名。 */
export function safeFileName(title) {
  return title.replace(/[\\/:*?"<>|]/g, "-")
}
