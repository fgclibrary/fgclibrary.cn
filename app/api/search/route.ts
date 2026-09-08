import { createTokenizer } from "@orama/tokenizers/mandarin"
import { createFromSource } from "fumadocs-core/search/server"
import { source } from "@/lib/source"

export const { GET } = createFromSource(source, {
  // zbsearch（fumadocs 内置引擎）在自定义 tokenizer 时禁止再传语言，
  // 否则抛 NO_LANGUAGE_WITH_CUSTOM_TOKENIZER。中文分词 tokenizer 自带语言，
  // 这里置空 language 以跳过该校验。
  language: "",
  components: {
    tokenizer: createTokenizer(),
  },
  search: {
    threshold: 0,
    tolerance: 0,
  },
})
