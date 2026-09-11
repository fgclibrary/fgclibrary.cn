/**
 * 图片预处理：把 public/images 下的 PNG/JPEG 压缩为 WebP。
 *
 * 站点为静态导出，next/image 已关闭优化（unoptimized），图片按原文件直出，
 * 因此需要在入库前把截图压到合理体积。默认参数为 1600px 宽 + WebP q80，
 * 对界面截图的文字清晰度无损（已人工比对）。
 *
 * 用法：
 *   pnpm images:optimize             仅生成 .webp，保留原始文件
 *   pnpm images:optimize -- --replace  生成后删除原始 PNG/JPEG
 *   pnpm images:optimize -- --force    即使 .webp 比源文件新也重新生成
 *
 * 处理完成后，记得把 Markdown 中的引用扩展名改为 .webp。
 */
import { readdir, stat, unlink } from "node:fs/promises"
import { extname, join } from "node:path"
import sharp from "sharp"

const ROOT = "public/images"
const MAX_WIDTH = 1600
const QUALITY = 80
const SOURCE_EXT = /\.(png|jpe?g)$/i

const replaceOriginals = process.argv.includes("--replace")
const force = process.argv.includes("--force")

/** 递归收集待处理图片 */
async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return collect(path)
      return SOURCE_EXT.test(entry.name) ? [path] : []
    }),
  )
  return files.flat()
}

const kb = (bytes) => Math.round(bytes / 1024)
const rel = (p) => p.replace(`${ROOT}/`, "")

const sources = (await collect(ROOT)).sort()
let beforeTotal = 0
let afterTotal = 0
let converted = 0
let skipped = 0

for (const source of sources) {
  const target = source.replace(SOURCE_EXT, ".webp")
  const sourceStat = await stat(source)
  beforeTotal += sourceStat.size

  if (!force) {
    const existing = await stat(target).catch(() => null)
    if (existing && existing.mtimeMs >= sourceStat.mtimeMs) {
      afterTotal += existing.size
      skipped += 1
      // 已是最新时也需处理 --replace，否则原文件会残留
      if (replaceOriginals) await unlink(source)
      continue
    }
  }

  const buffer = await sharp(source)
    // 依据 EXIF 自动纠正方向（对手机截图/照片尤其重要）
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer()

  await sharp(buffer).toFile(target)
  const targetStat = await stat(target)
  afterTotal += targetStat.size
  converted += 1

  console.log(
    `${rel(source).padEnd(46)} ${String(kb(sourceStat.size)).padStart(5)}KB -> ${String(kb(targetStat.size)).padStart(4)}KB`,
  )

  if (replaceOriginals) await unlink(source)
}

console.log(
  `\n完成：转换 ${converted} 张，跳过 ${skipped} 张（已是最新）`,
)
console.log(
  `体积：${(beforeTotal / 1024 / 1024).toFixed(2)}MB -> ${(afterTotal / 1024 / 1024).toFixed(2)}MB`,
)
if (converted > 0 && !replaceOriginals) {
  console.log("提示：确认无误后可加 --replace 重新执行以删除原始 PNG/JPEG。")
}
