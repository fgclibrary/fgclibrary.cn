import { createFromSource } from "fumadocs-core/search/server"
import { source } from "@/lib/source"

export const { GET } = createFromSource(source, {
  // 内置引擎默认使用 multilingual 分词（基于 Intl.Segmenter），
  // 原生支持中文等 CJK 文本，无需再配置自定义 tokenizer。
  search: {
    threshold: 0,
    tolerance: 0,
  },
})
