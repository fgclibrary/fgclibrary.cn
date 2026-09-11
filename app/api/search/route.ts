import { createFromSource } from "fumadocs-core/search/server"
import { source } from "@/lib/source"

// 静态导出：构建期生成搜索索引文件，由浏览器端加载后本地检索，
// 运行时不需要服务端接口。客户端在 app/layout.tsx 配置为 type: "static"。
export const dynamic = "force-static"
export const { staticGET: GET } = createFromSource(source, {
  // 内置引擎默认使用 multilingual 分词（基于 Intl.Segmenter），
  // 原生支持中文等 CJK 文本，无需再配置自定义 tokenizer。
  search: {
    threshold: 0,
    tolerance: 0,
  },
})
