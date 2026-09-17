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
import { readFile } from "node:fs/promises"
import path from "node:path"
import puppeteer from "puppeteer-core"

export const DEFAULT_BASE_URL = "http://localhost:3000"

export const SITE_NAME = "格言格语"
export const SITE_TAGLINE =
  "沉淀活字格开发中的工程经验、可复用方案与产品集成实践"

/** 封面默认 logo：站点上的 GrapeCity 标识（浅色底用的深色版）。 */
export const DEFAULT_COVER_LOGO = "/assets/grapecity-logo-light.png"

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

/** 转义 CSS 字符串字面量里的特殊字符（用于 url() 与 content）。 */
function cssUrl(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
}

/** 转义 CSS content 属性里的字符串。 */
function cssString(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", " ")
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

/**
 * 封面内容与版式。
 *
 * 版式（A4 满版）：
 *   右上 —— logo
 *   中部 —— 标题、副标题
 *   左下 —— 版本、日期（上下结构），可再加一行备注
 * 背景图铺满整页，内容压在其上。
 */
function buildCover({
  title,
  subtitle,
  version,
  date,
  note,
  logo,
  logoWidth,
  background,
  backgroundOpacity,
  isDark,
  fontSize = {},
  position = {},
}) {
  // 背景图直接设在内层 .export-cover__bleed 上：
  // background-image 不是可继承属性，放在外层再用 inherit 取不到值。
  // 内层独占一层，opacity 也正好只影响背景而不影响文字。
  //
  // 注意：这里必须对整段样式做 HTML 转义。属性用双引号包裹，而 url("...")
  // 里也有双引号，不转义会让属性在 url( 处提前闭合，背景图静默失效。
  const bleedStyle = background
    ? `background-image:url("${cssUrl(background)}");${
        backgroundOpacity === undefined
          ? ""
          : `--cover-bg-opacity:${backgroundOpacity};`
      }`
    : ""

  // 左下信息区：每个字段内部是「label 在上、value 在下」，各字段横向排成一行。
  const metaItems = [
    version ? { key: "version", label: "版本", value: version } : null,
    date ? { key: "date", label: "日期", value: date } : null,
    note ? { key: "note", label: "备注", value: note } : null,
  ].filter(Boolean)

  const metaHtml = metaItems
    .map(
      (
        item,
      ) => `<div class="export-cover__meta export-cover__meta--${item.key}">
        <span class="export-cover__meta-label">${escapeHtml(item.label)}</span>
        <span class="export-cover__meta-value">${escapeHtml(item.value)}</span>
      </div>`,
    )
    .join("\n      ")

  // 字号与位置通过 CSS 变量下发；未指定时用样式表里的默认值。
  const coverStyles = [
    fontSize.title ? `--cover-title-size:${fontSize.title};` : "",
    fontSize.subtitle ? `--cover-subtitle-size:${fontSize.subtitle};` : "",
    fontSize.meta ? `--cover-meta-size:${fontSize.meta};` : "",
    position.logo ? `--cover-logo-top:${position.logo};` : "",
    position.title ? `--cover-title-top:${position.title};` : "",
    position.meta ? `--cover-meta-top:${position.meta};` : "",
  ]
    .filter(Boolean)
    .join("")

  return `<section class="export-cover${isDark ? " export-cover--dark" : ""}"${
    coverStyles ? ` style="${escapeHtml(coverStyles)}"` : ""
  }>
  <div class="export-cover__bleed"${
    bleedStyle ? ` style="${escapeHtml(bleedStyle)}"` : ""
  } aria-hidden="true"></div>
  <div class="export-cover__frame">
    ${
      logo
        ? `<header class="export-cover__top">
      <img class="export-cover__logo" src="${escapeHtml(logo)}" alt=""${
        logoWidth ? ` style="width:${logoWidth}"` : ""
      } />
    </header>`
        : ""
    }
    <div class="export-cover__main">
      <h1 class="export-cover__title">${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="export-cover__subtitle">${escapeHtml(subtitle)}</p>` : ""}
    </div>
    <footer class="export-cover__bottom">
      ${metaHtml}
    </footer>
  </div>
</section>`
}

/**
 * 页眉页脚。
 *
 * 用 @page 的边距盒实现，而不是 page.pdf({ displayHeaderFooter })：
 * 后者的页眉页脚会画在每一页上、无法按页关闭，而封面要求没有页眉页脚。
 * 边距盒配合 @page :first 就能做到——封面页边距为 0 且清空边距盒内容，
 * 正文页正常显示，且 counter(pages) 给出的是全书总页数。
 */
function buildPageCss({ title, showHeaderFooter = true }) {
  const headerLine = title
    ? `@top-left { content: "${cssString(title)}"; font-size: 8px; color: #a1a1aa; letter-spacing: 0.02em; }`
    : ""

  if (!showHeaderFooter) {
    return `@page { size: A4; margin: 20mm 16mm 18mm; }`
  }

  return `@page {
  size: A4;
  margin: 20mm 16mm 18mm;
  ${headerLine}
  @bottom-center { content: "第 " counter(page) " 页 / 共 " counter(pages) " 页"; font-size: 8px; color: #a1a1aa; }
}

/* 封面页：零边距铺满整页，并清空边距盒，使其不带页眉页脚。 */
@page :first {
  margin: 0;
  @top-left { content: none; }
  @top-right { content: none; }
  @bottom-left { content: none; }
  @bottom-center { content: none; }
  @bottom-right { content: none; }
}`
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

/**
 * 封面与目录的排版样式（仅导出时注入）。
 *
 * 封面用「满版背景 + 内边距框架」两层结构：外层负责铺满整页（含出血），
 * 内层负责按安全边距摆放 logo、标题与版本信息。
 */
const LAYOUT_CSS = `
#export-root { color: #18181b; }
#export-root * { box-sizing: border-box; }

.export-cover {
  position: relative;
  /* 封面页边距为 0，这里铺满整页；overflow 防止高度溢出多出一张空白页。 */
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #fff;
  color: #18181b;
}

/*
 * 背景图独占一层（内联 style 提供 background-image），
 * 便于用不透明度调节深浅而不影响文字。默认不透明度为 1。
 */
.export-cover__bleed {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  opacity: var(--cover-bg-opacity, 1);
  z-index: 0;
}

/*
 * 封面三块内容（logo、标题块、信息区）都绝对定位，各自用 CSS 变量控制
 * 距页面顶部的距离，值可写百分比或长度，位置互不影响、可自由摆放。
 *
 * 用绝对定位而非 flex 排布，是为了让参数值与最终位置一一对应：
 * flex 下某个值还要叠加其它元素的高度，改一次量一次，很容易误判。
 */
.export-cover__frame {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 0 16mm;
}

.export-cover__top {
  position: absolute;
  top: var(--cover-logo-top, 5.4%);
  right: 16mm;
}
.export-cover__logo { width: 48mm; height: auto; display: block; }

.export-cover__main {
  position: absolute;
  top: var(--cover-title-top, 30%);
  left: 16mm;
  right: 16mm;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.export-cover__title {
  font-size: var(--cover-title-size, 36pt);
  font-weight: 800;
  line-height: 1.25;
  margin: 0;
  letter-spacing: -0.01em;
}
.export-cover__subtitle {
  font-size: var(--cover-subtitle-size, 12pt);
  line-height: 1.5;
  color: #52525b;
  margin: 0;
  max-width: 34em;
}

/*
 * 左下信息区：各字段横向排成一行，字段内部 label 在上、value 在下，
 * 与封面上的 logo、标题一起构成左上/中部/左下三区。
 */
.export-cover__bottom {
  position: absolute;
  top: var(--cover-meta-top, 92%);
  left: 16mm;
  right: 16mm;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8mm 12mm;
}

.export-cover__meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

/* label 小号、拉开字距，与 value 形成明显层级。 */
/* 信息区：label 随 value 等比缩放（默认 14px 对应 label 约 9px）。 */
.export-cover__meta-label {
  font-size: calc(var(--cover-meta-size, 14px) * 0.64);
  font-weight: 500;
  letter-spacing: 0.18em;
  color: #8a8f98;
}

.export-cover__meta-value {
  font-size: var(--cover-meta-size, 14px);
  font-weight: 600;
  line-height: 1.3;
  color: #27272a;
  font-variant-numeric: tabular-nums;
}

/* 备注较长，给一个宽度上限让它换行；不能用 flex:1 撑开，
   否则会把后面的字段推到页面最右侧。 */
.export-cover__meta--note {
  max-width: 34%;
}
.export-cover__meta--note .export-cover__meta-value {
  font-weight: 500;
  color: #52525b;
}

/*
 * 深色背景：文字与分隔线换成浅色。
 * 由服务端根据背景图亮度自动加上 export-cover--dark，
 * 也可以显式指定（CLI 的 --cover-theme dark）。
 */
.export-cover--dark {
  color: #fafafa;
}
.export-cover--dark .export-cover__subtitle { color: #d4d4d8; }
.export-cover--dark .export-cover__meta-label { color: rgba(255, 255, 255, 0.66); }
.export-cover--dark .export-cover__meta-value { color: #fafafa; }
.export-cover--dark .export-cover__meta--note .export-cover__meta-value {
  color: #d4d4d8;
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

const IMAGE_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
}

/**
 * 把封面用到的图片解析成可直接嵌入的地址。
 *
 * 支持三种写法：
 *   - http(s):// 或 data: 原样使用；
 *   - 站点资源路径（如 /assets/logo.png），转成站点绝对地址，由浏览器加载；
 *   - 本地文件路径，读成 data URL 内联，这样换台机器或站点没跑也能出图。
 *
 * 相对路径按项目根目录解析，便于命令行里直接写 public 下的文件。
 */
async function resolveImageRef(input, { baseUrl, label }) {
  const value = String(input ?? "").trim()
  if (!value) {
    return ""
  }

  if (/^(https?:|data:)/i.test(value)) {
    return value
  }

  // 先看磁盘上是否真有这个文件。
  // 绝对路径（/tmp/bg.png）与站内路径（/assets/logo.png）都以 / 开头，
  // 因此必须以“文件是否存在”来区分，否则绝对路径会被当成站内路径取成 404。
  const filePath = path.resolve(value)
  let buffer = null
  if (existsSync(filePath)) {
    buffer = await readFile(filePath)
  }

  if (buffer === null) {
    // 磁盘上没有这个文件；以 / 开头的按站内路径交给浏览器取，
    // 其余情况视为路径写错，直接报出来比默默出一张白图好。
    if (value.startsWith("/")) {
      return new URL(value, baseUrl).href
    }
    throw new Error(`${label}读取失败：找不到文件 ${filePath}`)
  }

  const mime = IMAGE_MIME[path.extname(filePath).toLowerCase()]
  if (!mime) {
    throw new Error(
      `${label}格式不支持：${filePath}（可用 png/jpg/webp/gif/svg/avif）`,
    )
  }

  return `data:${mime};base64,${buffer.toString("base64")}`
}

/**
 * 判断背景图整体偏深还是偏浅，用于自动切换封面文字与 logo 的配色。
 *
 * 用 sharp 读均色（已是依赖，不额外引入）。取不到就返回 null，
 * 由调用方回退到浅色背景的默认配色，不影响出图。
 */
/**
 * 判断背景图整体偏深还是偏浅，用于自动切换封面文字与 logo 的配色。
 *
 * 用 sharp 读均色（已是依赖，不额外引入）。支持本地文件、网址与 data URL；
 * 任何一步失败都返回 null，由调用方回退到浅色背景的默认配色，不影响出图。
 */
async function detectBackgroundTone(value) {
  try {
    const { default: sharp } = await import("sharp")
    const input = await readImageForTone(value)
    if (!input) {
      return null
    }

    const { channels } = await sharp(input)
      .resize(8, 8, { fit: "fill" })
      .stats()
    const [r, g, b] = channels.map((channel) => channel.mean)

    // 相对亮度（sRGB 近似），0 为黑、255 为白。
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luminance < 140 ? "dark" : "light"
  } catch {
    return null
  }
}

/** 把背景图取成 sharp 能吃的输入（路径或 Buffer）；取不到返回 null。 */
async function readImageForTone(value) {
  // 网址：取回字节再判断，否则远程深色背景会回退成深色文字而看不清。
  if (/^https?:/i.test(value)) {
    const response = await fetch(value, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      return null
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    // 只取前 12MB 判断色调足够了，避免拉一个巨大的图。
    return buffer.subarray(0, 12 * 1024 * 1024)
  }

  if (value.startsWith("data:")) {
    const comma = value.indexOf(",")
    if (comma < 0) {
      return null
    }
    const meta = value.slice(5, comma)
    const payload = value.slice(comma + 1)
    return meta.includes("base64")
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8")
  }

  const filePath = path.resolve(value)
  if (!existsSync(filePath)) {
    return null
  }
  return filePath
}

/**
 * 归一化封面配置：解析图片、换算透明度、兜底默认 logo。
 *
 * logo 的取值语义：
 *   - showLogo 为 false      → 不要 logo；
 *   - logo 为空或未提供      → 用默认的 GrapeCity 标识；
 *   - logo 为路径/网址       → 用该图片。
 * 之所以用独立的 showLogo 而不是拿空串表示“不要”，是因为空串同样是
 * “用户没填”的常见形态，两者混在一起会让默认 logo 永远出不来。
 */
async function resolveCoverAssets(cover, { baseUrl }) {
  const { version, note, logoWidth, backgroundOpacity } = cover

  // 先看背景深浅：深色背景要改用白色版 logo 与浅色文字，否则看不清。
  const tone = cover.background
    ? await detectBackgroundTone(cover.background)
    : null
  const isDark =
    cover.theme === "dark" || (cover.theme !== "light" && tone === "dark")

  // 未显式指定 logo 时，按背景深浅自动挑浅色版或深色版标识。
  const defaultLogo = isDark
    ? DEFAULT_COVER_LOGO.replace("-light.", "-dark.")
    : DEFAULT_COVER_LOGO
  const logoPath =
    typeof cover.logo === "string" && cover.logo.trim()
      ? cover.logo
      : defaultLogo

  const logo =
    cover.showLogo === false
      ? ""
      : await resolveImageRef(logoPath, { baseUrl, label: "封面 logo " })

  const background = cover.background
    ? await resolveImageRef(cover.background, {
        baseUrl,
        label: "封面背景图 ",
      })
    : ""

  let opacity
  if (
    backgroundOpacity !== undefined &&
    backgroundOpacity !== null &&
    backgroundOpacity !== ""
  ) {
    const parsed = Number(backgroundOpacity)
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
      throw new Error("封面背景图不透明度需在 0 到 1 之间")
    }
    opacity = parsed
  }

  return {
    logo,
    logoWidth,
    background,
    backgroundOpacity: opacity,
    isDark,
    version,
    note,
    fontSize: normalizeFontSizes(cover.fontSize),
    position: {
      logo: normalizePosition(cover.position?.logo, "Logo 位置"),
      title: normalizePosition(cover.position?.title, "主标题位置"),
      meta: normalizePosition(cover.position?.meta, "信息区位置"),
    },
  }
}

/** 尺寸只允许「数字 + 可选单位」，避免把任意字符串拼进内联样式。 */
const CSS_LENGTH_PATTERN = /^\d+(\.\d+)?(pt|px|mm|cm|in|em|rem|%)?$/
const BARE_NUMBER_PATTERN = /^\d+(\.\d+)?$/

/**
 * 校验一个 CSS 长度值。
 * 允许纯数字（按 defaultUnit 理解），也允许带单位；
 * 非法值直接报错，而不是拼出一个无效的 CSS 值让它静默失效。
 */
function normalizeCssLength(raw, { defaultUnit, label }) {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return ""
  }

  const value = String(raw).trim()
  if (!CSS_LENGTH_PATTERN.test(value)) {
    throw new Error(
      `封面${label}取值无效：${value}（可写带单位的值，或只写数字默认按 ${defaultUnit}）`,
    )
  }

  return BARE_NUMBER_PATTERN.test(value) ? `${value}${defaultUnit}` : value
}

/**
 * 校验三个封面字号。只写数字时按 pt 处理，与 A4 印刷尺寸对应。
 */
function normalizeFontSizes(input) {
  const source = input && typeof input === "object" ? input : {}
  const result = {}

  for (const field of ["title", "subtitle", "meta"]) {
    const label = {
      title: "主标题字号",
      subtitle: "副标题字号",
      meta: "信息区字号",
    }[field]
    const value = normalizeCssLength(source[field], {
      defaultUnit: "pt",
      label,
    })
    if (value) {
      result[field] = value
    }
  }

  return result
}

/**
 * 校验封面元素的位置（距页面顶部的距离）。
 * 只写数字时按 % 处理；不做范围限制，允许自行摆放（包括故意重叠）。
 */
function normalizePosition(raw, label) {
  return normalizeCssLength(raw, { defaultUnit: "%", label })
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
     * @param config baseUrl / chapters / title / subtitle / version / date /
     *               note / logo / logoWidth / background / backgroundOpacity /
     *               toc / siteUrl
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

      // 封面图片要在这里解析：本地文件读成 data URL，站内路径转成绝对地址。
      const cover = await resolveCoverAssets(config.cover ?? {}, { baseUrl })

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
          // 把最终采用的封面配色带出去，便于命令行与界面显示，
          // 免得自动判断变成一个看不见的黑盒。
          coverTheme: cover.isDark ? "dark" : "light",
        })

        const root = `${buildCover({
          title,
          subtitle,
          date,
          ...cover,
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

        // 换完 DOM 立刻停掉页面脚本。
        //
        // 站点是 Next.js 应用，React 会在空闲时水合并按自己的虚拟 DOM
        // 重写 body。抓取第一页时若该页仍在编译（dev 首次访问较慢），
        // 水合就可能发生在我们替换之后，把整本手册覆盖回单个原始页面，
        // 而且导出照样成功——静默产出错误的 PDF。禁用 JS 可根除该竞态；
        // 样式表是外链、PDF 打印也不依赖脚本，因此不影响产物。
        await page.setJavaScriptEnabled(false)

        await page.addStyleTag({ content: LAYOUT_CSS })
        await page.addStyleTag({ content: PRINT_CSS })
        // 页眉页脚与封面页边距放在 @media print 之外，
        // 确保 @page 规则被采用。
        await page.addStyleTag({ content: buildPageCss({ title }) })

        // 打印前自检：万一手册仍被覆盖，宁可报错也不要交出错误的 PDF。
        const rootState = await page.evaluate(() => ({
          hasRoot: !!document.getElementById("export-root"),
          covers: document.querySelectorAll(".export-cover").length,
          chapters: document.querySelectorAll(".export-chapter").length,
        }))
        if (!rootState.hasRoot || rootState.chapters !== chapters.length) {
          throw new Error(
            "手册内容在排版阶段被页面脚本覆盖，请重试；" +
              "若持续失败，请重启本地站点（pnpm dev）。",
          )
        }

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

        // PDF 的标题取 document.title；Next.js 会在水合时改写它，
        // 所以放到打印前一刻设置。
        await page.evaluate((value) => {
          document.title = value
        }, title)

        // 排查封面/排版问题时可用 MANUAL_DEBUG=<png 路径> 抓一张打印视图。
        if (process.env.MANUAL_DEBUG) {
          await page.emulateMediaType("print")
          await page.screenshot({ path: process.env.MANUAL_DEBUG })
          const state = await page.evaluate(() => {
            const bleed = document.querySelector(".export-cover__bleed")
            const logo = document.querySelector(".export-cover__logo")
            return {
              covers: document.querySelectorAll(".export-cover").length,
              chapters: document.querySelectorAll(".export-chapter").length,
              background: bleed
                ? getComputedStyle(bleed).backgroundImage.slice(0, 40)
                : null,
              logoLoaded: logo ? logo.complete && logo.naturalWidth > 0 : null,
            }
          })
          process.stderr.write(`[debug] ${JSON.stringify(state)}\n`)
        }

        // 不使用 displayHeaderFooter：它的页眉页脚会画在每一页且无法按页关闭。
        // 页眉页脚与页面边距由上面的 @page 规则提供。
        return await page.pdf({
          format: "A4",
          printBackground: true,
          // 让 Chrome 依据标题生成 PDF 书签，便于在阅读器里跳转。
          outline: true,
          tagged: true,
          preferCSSPageSize: true,
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
