/*
 * 手册工坊的前端逻辑。
 *
 * 只做三件事：呈现文档树并收集选择、把选择与参数发给本地服务、在弹窗里展示生成的 PDF。
 * 真正抓取与排版都在服务端（scripts/manual-studio.mjs）完成。
 */

const el = (id) => document.getElementById(id)

const ui = {
  baseUrl: el("baseUrl"),
  reload: el("reload"),
  siteStatus: el("siteStatus"),
  docCount: el("docCount"),
  filter: el("filter"),
  expandAll: el("expandAll"),
  collapseAll: el("collapseAll"),
  clearAll: el("clearAll"),
  tree: el("tree"),
  selected: el("selected"),
  selectedCount: el("selectedCount"),
  selectedHint: el("selectedHint"),
  preset: el("preset"),
  presetToggle: el("presetToggle"),
  presetLabel: el("presetLabel"),
  presetMenu: el("presetMenu"),
  presetSave: el("presetSave"),
  presetDelete: el("presetDelete"),
  presetExport: el("presetExport"),
  presetImport: el("presetImport"),
  presetPicker: el("presetPicker"),
  title: el("title"),
  subtitle: el("subtitle"),
  date: el("date"),
  toc: el("toc"),
  siteUrl: el("siteUrl"),
  version: el("version"),
  note: el("note"),
  showLogo: el("showLogo"),
  logo: el("logo"),
  logoWidth: el("logoWidth"),
  coverBg: el("coverBg"),
  coverBgOpacity: el("coverBgOpacity"),
  coverTheme: el("coverTheme"),
  fontTitle: el("fontTitle"),
  fontSubtitle: el("fontSubtitle"),
  fontMeta: el("fontMeta"),
  positionLogo: el("positionLogo"),
  positionTitle: el("positionTitle"),
  positionMeta: el("positionMeta"),
  logoPreview: el("logoPreview"),
  logoNote: el("logoNote"),
  coverBgPreview: el("coverBgPreview"),
  coverBgNote: el("coverBgNote"),
  filePicker: el("filePicker"),
  preview: el("preview"),
  download: el("download"),
  progress: el("progress"),
  previewDialog: el("previewDialog"),
  previewTitle: el("previewTitle"),
  previewMeta: el("previewMeta"),
  previewFrame: el("previewFrame"),
  previewClose: el("previewClose"),
  downloadInDialog: el("downloadInDialog"),
  openTab: el("openTab"),
}

const state = {
  tree: null,
  /** 选择顺序即手册顺序，元素为 slug。 */
  selected: [],
  presets: [],
  presetName: "",
  /** slug -> { title } */
  pages: new Map(),
  /** key -> { node, row, checkbox, childrenEl } */
  nodes: new Map(),
  collapsed: new Set(),
  lastJob: null,
  lastPdfUrl: "",
  lastConfigKey: "",
  rendering: false,
}

/* ------------------------------------------------------------ 工具函数 */

function setStatus(text, kind = "") {
  ui.siteStatus.textContent = text
  ui.siteStatus.className = `status${kind ? ` status--${kind}` : ""}`
}

function setProgress(text, kind = "") {
  ui.progress.textContent = text
  ui.progress.className = `progress${kind ? ` progress--${kind}` : ""}`
}

function formatSize(bytes) {
  if (!bytes) {
    return ""
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

function currentConfig() {
  return {
    baseUrl: ui.baseUrl.value.trim().replace(/\/+$/, ""),
    slugs: state.selected.slice(),
    title: ui.title.value.trim(),
    subtitle: ui.subtitle.value.trim(),
    date: ui.date.value.trim() || today(),
    toc: ui.toc.checked,
    siteUrl: ui.siteUrl.value.trim().replace(/\/+$/, ""),
    cover: {
      version: ui.version.value.trim(),
      note: ui.note.value.trim(),
      // 空 logo 字段表示“用默认标识”，是否显示由独立的开关决定。
      showLogo: ui.showLogo.checked,
      logo: ui.logo.value.trim(),
      logoWidth: ui.logoWidth.value.trim(),
      background: ui.coverBg.value.trim(),
      backgroundOpacity: ui.coverBgOpacity.value.trim(),
      theme: ui.coverTheme.value,
      fontSize: {
        title: ui.fontTitle.value.trim(),
        subtitle: ui.fontSubtitle.value.trim(),
        meta: ui.fontMeta.value.trim(),
      },
      position: {
        logo: ui.positionLogo.value.trim(),
        title: ui.positionTitle.value.trim(),
        meta: ui.positionMeta.value.trim(),
      },
    },
  }
}

/** 把封面字段写回表单，用于载入预设。 */
function applyCoverFields(cover = {}) {
  ui.version.value = cover.version ?? ""
  ui.note.value = cover.note ?? ""
  // 旧预设没有 showLogo 字段，按显示处理。
  ui.showLogo.checked = cover.showLogo !== false
  ui.logo.value = cover.logo ?? ""
  ui.logoWidth.value = cover.logoWidth ?? ""
  ui.coverBg.value = cover.background ?? ""
  ui.coverBgOpacity.value = cover.backgroundOpacity ?? ""
  ui.coverTheme.value = cover.theme ?? "auto"

  // 旧预设没有 fontSize，留空即用样式表里的默认字号。
  const fontSize = cover.fontSize ?? {}
  ui.fontTitle.value = fontSize.title ?? ""
  ui.fontSubtitle.value = fontSize.subtitle ?? ""
  ui.fontMeta.value = fontSize.meta ?? ""
  const position = cover.position ?? {}
  ui.positionLogo.value = position.logo ?? ""
  ui.positionTitle.value = position.title ?? ""
  ui.positionMeta.value = position.meta ?? ""
}

const configKey = (config) => JSON.stringify(config)

/* -------------------------------------------------------------- 文档树 */

async function loadDocs({ refresh = false } = {}) {
  setStatus("读取文档…")
  ui.reload.disabled = true

  try {
    const baseUrl = ui.baseUrl.value.trim().replace(/\/+$/, "")
    const query = new URLSearchParams({ baseUrl })
    if (refresh) {
      query.set("refresh", "1")
    }

    const response = await fetch(`/api/docs?${query}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    state.tree = data.tree
    state.pages = new Map(data.pages.map((page) => [slugOf(page.url), page]))

    // 站点换了以后，旧的选择可能已不存在。
    const known = new Set(state.pages.keys())
    state.selected = state.selected.filter((slug) => known.has(slug))

    renderTree()
    renderSelected()

    ui.docCount.textContent = String(data.count)
    setStatus(`已连接 ${data.baseUrl}`, "ok")
    // 记住站点地址，刷新后不必重填。
    localStorage.setItem("manual-studio:baseUrl", data.baseUrl)
  } catch (error) {
    setStatus(`读取失败：${error.message}`, "error")
    ui.docCount.textContent = "—"
    ui.tree.replaceChildren()
    state.tree = null
  } finally {
    ui.reload.disabled = false
  }
}

function slugOf(url) {
  return url
    .replace(/^\/+/, "")
    .replace(/^docs\/?/, "")
    .replace(/\/+$/, "")
}

function renderTree() {
  ui.tree.replaceChildren()
  state.nodes.clear()

  if (!state.tree) {
    return
  }

  const walk = (nodes, parentEl, path) => {
    for (const [i, node] of nodes.entries()) {
      const key = `${path}/${i}`
      const isPage = node.kind === "page"

      const row = document.createElement("div")
      row.className = `tree__row tree__row--${node.kind}`
      row.dataset.key = key
      row.dataset.kind = node.kind
      row.dataset.title = node.title

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      const twisty = document.createElement("span")
      const label = document.createElement("span")
      label.className = "tree__label"
      label.textContent = node.title
      if (node.description) {
        label.title = node.description
      }

      if (node.kind === "separator") {
        // 分隔线只是 meta.json 里的排版标记，不参与选择。
        twisty.className = "tree__twisty tree__twisty--leaf"
        label.textContent = node.title
        row.append(label)
        parentEl.append(row)
        state.nodes.set(key, { node, key, row, checkbox: null })
        continue
      }

      // 顺序固定为「折叠箭头 → 复选框 → 标题」：分组的箭头换成可点按钮，
      // 单页留一个等宽占位元素，这样同级各项的复选框始终对齐。
      let childrenEl = null
      if (isPage) {
        twisty.className = "tree__twisty tree__twisty--leaf"
        checkbox.dataset.slug = node.slug
        row.append(twisty)
      } else {
        const button = document.createElement("button")
        button.type = "button"
        button.className = "tree__twisty"
        button.textContent = state.collapsed.has(key) ? "▸" : "▾"
        button.setAttribute(
          "aria-label",
          state.collapsed.has(key) ? "展开" : "折叠",
        )
        row.append(button)

        childrenEl = document.createElement("div")
        childrenEl.className = state.collapsed.has(key)
          ? "tree__children tree__children--collapsed"
          : "tree__children"
      }

      row.append(checkbox, label)
      parentEl.append(row)

      state.nodes.set(key, { node, key, row, checkbox, childrenEl })

      if (childrenEl) {
        parentEl.append(childrenEl)
        walk(node.children, childrenEl, key)
      }
    }
  }

  walk(state.tree.children, ui.tree, "")
  syncCheckboxes()
}

function descendantsOf(key) {
  const entry = state.nodes.get(key)
  if (!entry?.node.descendants) {
    return []
  }
  return entry.node.descendants
}

function syncCheckboxes() {
  const selected = new Set(state.selected)

  for (const [key, entry] of state.nodes) {
    if (!entry.checkbox) {
      continue
    }

    if (entry.node.kind === "page") {
      entry.checkbox.checked = selected.has(entry.node.slug)
      entry.checkbox.indeterminate = false
      continue
    }

    const descendants = descendantsOf(key)
    const hit = descendants.filter((slug) => selected.has(slug)).length
    entry.checkbox.checked = hit > 0 && hit === descendants.length
    entry.checkbox.indeterminate = hit > 0 && hit < descendants.length
  }
}

function addSlugs(slugs) {
  const known = new Set(state.selected)
  for (const slug of slugs) {
    if (!known.has(slug)) {
      state.selected.push(slug)
      known.add(slug)
    }
  }
}

function removeSlugs(slugs) {
  const drop = new Set(slugs)
  state.selected = state.selected.filter((slug) => !drop.has(slug))
}

/** 整章勾选时，其下页面按站点顺序追加到已选末尾，用户仍可再拖动。 */
function toggleSelection(slugs, on) {
  if (on) {
    addSlugs(slugs)
  } else {
    removeSlugs(slugs)
  }
  syncCheckboxes()
  renderSelected()
}

/* -------------------------------------------------------------- 已选列表 */

function renderSelected() {
  ui.selected.replaceChildren()

  state.selected.forEach((slug, index) => {
    const info = state.pages.get(slug)
    const li = document.createElement("li")
    li.className = "selected__item"
    li.draggable = true
    li.dataset.slug = slug
    li.dataset.index = String(index)

    const num = document.createElement("span")
    num.className = "selected__index"
    num.textContent = String(index + 1)

    const title = document.createElement("span")
    title.className = "selected__title"
    title.textContent = info?.title ?? slug

    const remove = document.createElement("button")
    remove.type = "button"
    remove.className = "selected__remove"
    remove.textContent = "×"
    remove.title = "从手册中移除"
    remove.setAttribute("aria-label", `移除 ${info?.title ?? slug}`)

    li.append(num, title, remove)
    ui.selected.append(li)
  })

  ui.selectedCount.textContent = String(state.selected.length)
  ui.selectedHint.hidden = state.selected.length > 0
  invalidateResult()
}

/* ------------------------------------------------------------ 选择交互 */

ui.tree.addEventListener("click", (event) => {
  const button = event.target.closest(".tree__twisty")
  const row = event.target.closest(".tree__row")
  if (!row) {
    return
  }

  const key = row.dataset.key
  const entry = state.nodes.get(key)
  if (!entry) {
    return
  }

  if (button) {
    if (entry.childrenEl) {
      const collapsed = !state.collapsed.has(key)
      if (collapsed) {
        state.collapsed.add(key)
      } else {
        state.collapsed.delete(key)
      }
      entry.childrenEl.classList.toggle("tree__children--collapsed", collapsed)
      button.textContent = collapsed ? "▸" : "▾"
      button.setAttribute("aria-label", collapsed ? "展开" : "折叠")
    }
    return
  }

  // 点在复选框或整行上，都切换该节点的选择。
  if (event.target.tagName !== "INPUT" && row.dataset.kind === "separator") {
    return
  }

  // 注意不要读 entry.checkbox.checked：浏览器在派发 click 之前就已经把
  // 复选框切到新状态了，用它会得到相反的结果。这里只依据自己的状态判断，
  // 点击后再由 syncCheckboxes() 把 DOM 校准回来。
  if (entry.node.kind === "page") {
    const isSelected = state.selected.includes(entry.node.slug)
    toggleSelection([entry.node.slug], !isSelected)
  } else {
    const descendants = descendantsOf(key)
    const allSelected =
      descendants.length > 0 &&
      descendants.every((slug) => state.selected.includes(slug))
    toggleSelection(descendants, !allSelected)
  }
})

ui.selected.addEventListener("click", (event) => {
  const item = event.target.closest(".selected__item")
  if (!item) {
    return
  }

  if (event.target.closest(".selected__remove")) {
    removeSlugs([item.dataset.slug])
    syncCheckboxes()
    renderSelected()
    return
  }

  // 点条目时把左侧导航滚动到对应位置，便于核对。
  for (const entry of state.nodes.values()) {
    if (entry.node.slug === item.dataset.slug) {
      entry.row.scrollIntoView({ block: "center" })
      entry.row.style.background = "var(--accent-soft)"
      setTimeout(() => {
        entry.row.style.background = ""
      }, 900)
      break
    }
  }
})

/* 拖拽排序：选择顺序就是手册中的章次顺序。 */
let dragIndex = -1

ui.selected.addEventListener("dragstart", (event) => {
  const item = event.target.closest(".selected__item")
  if (!item) {
    return
  }
  dragIndex = Number(item.dataset.index)
  item.classList.add("selected__item--dragging")
  event.dataTransfer.effectAllowed = "move"
  // Firefox 需要写入数据，拖拽才会启动。
  // 文档首页的 slug 是空串，而 setData 传空串在部分浏览器不生效，故留个兜底值。
  event.dataTransfer.setData("text/plain", item.dataset.slug || "docs")
})

ui.selected.addEventListener("dragover", (event) => {
  const item = event.target.closest(".selected__item")
  if (!item || dragIndex < 0) {
    return
  }
  event.preventDefault()
  for (const other of ui.selected.children) {
    other.classList.toggle("selected__item--over", other === item)
  }
})

ui.selected.addEventListener("dragleave", (event) => {
  if (!event.target.closest(".selected__item")) {
    for (const other of ui.selected.children) {
      other.classList.remove("selected__item--over")
    }
  }
})

ui.selected.addEventListener("drop", (event) => {
  const item = event.target.closest(".selected__item")
  if (!item || dragIndex < 0) {
    return
  }
  event.preventDefault()

  const to = Number(item.dataset.index)
  const [moved] = state.selected.splice(dragIndex, 1)
  state.selected.splice(to, 0, moved)

  dragIndex = -1
  renderSelected()
  syncCheckboxes()
})

ui.selected.addEventListener("dragend", () => {
  dragIndex = -1
  for (const item of ui.selected.children) {
    item.classList.remove("selected__item--dragging", "selected__item--over")
  }
})

/* ---------------------------------------------------------------- 筛选 */

ui.filter.addEventListener("input", () => {
  const keyword = ui.filter.value.trim().toLowerCase()
  const matching = new Set()

  if (keyword) {
    for (const [key, entry] of state.nodes) {
      if (entry.node.kind !== "page") {
        continue
      }
      // 标题与描述都参与匹配，便于按内容而非标题找文档。
      const haystack =
        `${entry.node.title}\n${entry.node.description ?? ""}`.toLowerCase()
      if (haystack.includes(keyword)) {
        matching.add(key)
      }
    }
  }

  // 命中页面的所有祖先分组都要保留，并临时展开。
  const visibleGroups = new Set()
  if (keyword) {
    for (const key of matching) {
      const parts = key.split("/")
      for (let i = 1; i < parts.length; i++) {
        visibleGroups.add(parts.slice(0, i).join("/"))
      }
    }
  }

  for (const [key, entry] of state.nodes) {
    const isPage = entry.node.kind === "page"
    const selfMatch =
      !keyword ||
      (isPage && matching.has(key)) ||
      (!isPage && visibleGroups.has(key)) ||
      entry.node.kind === "separator"

    entry.row.classList.toggle("tree__row--hidden", !selfMatch)

    if (entry.childrenEl) {
      // 筛选时强制展开，方便看到命中结果。
      entry.childrenEl.classList.toggle(
        "tree__children--collapsed",
        keyword ? false : state.collapsed.has(key),
      )
    }
  }

  if (!keyword) {
    // 还原用户的折叠状态。
    for (const [key, entry] of state.nodes) {
      if (entry.childrenEl) {
        entry.childrenEl.classList.toggle(
          "tree__children--collapsed",
          state.collapsed.has(key),
        )
      }
    }
  }
})

ui.expandAll.addEventListener("click", () => {
  state.collapsed.clear()
  renderTree()
})

ui.collapseAll.addEventListener("click", () => {
  for (const [key, entry] of state.nodes) {
    if (entry.childrenEl) {
      state.collapsed.add(key)
    }
  }
  renderTree()
})

ui.clearAll.addEventListener("click", () => {
  state.selected = []
  syncCheckboxes()
  renderSelected()
})

/* ---------------------------------------------------------------- 预设 */

async function loadPresets() {
  try {
    const response = await fetch("/api/presets")
    const data = await response.json()
    state.presets = Array.isArray(data.presets) ? data.presets : []
  } catch {
    state.presets = []
  }
  renderPresets()
}

/**
 * 预设用自定义下拉呈现。
 * 原生 select 的展开列表由浏览器/系统绘制，项数一多就可能超出窗口且拿不到滚动条，
 * 这里自己渲染列表，滚动行为完全可控。
 */
function renderPresets() {
  ui.presetLabel.textContent = state.presetName || "— 预设组合 —"
  ui.presetMenu.replaceChildren()

  if (state.presets.length === 0) {
    const empty = document.createElement("p")
    empty.className = "preset__empty"
    empty.textContent = "还没有预设。选好文档后点“保存预设”。"
    ui.presetMenu.append(empty)
    return
  }

  for (const preset of state.presets) {
    const item = document.createElement("button")
    item.type = "button"
    item.className = "preset__item"
    item.dataset.name = preset.name
    item.setAttribute("role", "option")
    item.setAttribute("aria-selected", String(preset.name === state.presetName))
    if (preset.name === state.presetName) {
      item.classList.add("is-active")
    }

    const name = document.createElement("span")
    name.className = "preset__name"
    name.textContent = preset.name

    const count = document.createElement("span")
    count.className = "preset__count"
    count.textContent = `${preset.slugs.length} 篇`

    item.append(name, count)
    ui.presetMenu.append(item)
  }
}

function setPresetMenuOpen(open) {
  ui.presetMenu.hidden = !open
  ui.presetToggle.setAttribute("aria-expanded", String(open))
}

async function savePresets() {
  await fetch("/api/presets", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presets: state.presets }),
  })
  renderPresets()
}

function applyPreset(preset) {
  const known = new Set(state.pages.keys())
  const missing = preset.slugs.filter((slug) => !known.has(slug))
  state.selected = preset.slugs.filter((slug) => known.has(slug))
  state.presetName = preset.name

  ui.title.value = preset.title ?? ""
  ui.subtitle.value = preset.subtitle ?? ""
  ui.toc.checked = preset.toc !== false
  ui.siteUrl.value = preset.siteUrl ?? ""
  applyCoverFields(preset.cover)
  refreshImageHints()

  syncCheckboxes()
  renderSelected()
  renderPresets()

  const note = missing.length
    ? `，其中 ${missing.length} 篇已不在站点中，已跳过`
    : ""
  setProgress(
    `已载入预设“${preset.name}”（${state.selected.length} 篇）${note}`,
  )
}

ui.presetToggle.addEventListener("click", () => {
  setPresetMenuOpen(ui.presetMenu.hidden)
})

ui.presetMenu.addEventListener("click", (event) => {
  const item = event.target.closest(".preset__item")
  if (!item) {
    return
  }
  const preset = state.presets.find((entry) => entry.name === item.dataset.name)
  setPresetMenuOpen(false)
  if (preset) {
    applyPreset(preset)
  }
})

// 点击别处或按 Esc 收起下拉。
document.addEventListener("click", (event) => {
  if (!ui.presetMenu.hidden && !ui.preset.contains(event.target)) {
    setPresetMenuOpen(false)
  }
})

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !ui.presetMenu.hidden) {
    setPresetMenuOpen(false)
  }
})

ui.presetSave.addEventListener("click", async () => {
  if (state.selected.length === 0) {
    setProgress("请先选择文档，再保存预设。", "error")
    return
  }

  const suggested = state.presetName || ui.title.value.trim() || "新组合"
  const name = window.prompt("预设名称", suggested)?.trim()
  if (!name) {
    return
  }

  const config = currentConfig()
  const preset = {
    name,
    slugs: config.slugs,
    title: config.title,
    subtitle: config.subtitle,
    toc: config.toc,
    siteUrl: config.siteUrl,
    cover: config.cover,
  }

  const existing = state.presets.findIndex((item) => item.name === name)
  if (existing >= 0) {
    state.presets[existing] = preset
  } else {
    state.presets.push(preset)
  }

  state.presetName = name
  await savePresets()
  setProgress(`已保存预设“${name}”`)
})

ui.presetDelete.addEventListener("click", async () => {
  const name = state.presetName
  if (!name) {
    setProgress("请先选择一个预设。", "error")
    return
  }
  if (!window.confirm(`删除预设“${name}”？`)) {
    return
  }

  state.presets = state.presets.filter((item) => item.name !== name)
  state.presetName = ""
  await savePresets()
  setProgress(`已删除预设“${name}”`)
})

/* ---------------------------------------------------------------- 渲染 */

function invalidateResult() {
  // 选择或参数变了，之前生成的 PDF 不再对应当前配置。
  state.lastConfigKey = ""
}

function setBusy(busy) {
  state.rendering = busy
  ui.preview.disabled = busy
  ui.download.disabled = busy
  // 与 index.html 里的初始文案保持一致。
  ui.preview.textContent = busy ? "生成中…" : "预览"
}

/**
 * 生成（或复用）当前配置的 PDF。
 * 返回 jobId；服务端按配置哈希缓存，参数没变时不会重复渲染。
 */
async function ensureRendered() {
  const config = currentConfig()

  if (state.selected.length === 0) {
    throw new Error("请先选择至少一篇文档")
  }

  const key = configKey(config)
  if (state.lastJob && state.lastConfigKey === key) {
    return state.lastJob
  }

  setBusy(true)
  setProgress("提交渲染任务…")

  try {
    const response = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    const jobId = await waitForJob(data.jobId)
    state.lastJob = jobId
    state.lastConfigKey = key
    return jobId
  } finally {
    setBusy(false)
  }
}

/** 通过 SSE 跟踪渲染进度，完成时返回 jobId。 */
function waitForJob(jobId) {
  return new Promise((resolve, reject) => {
    const source = new EventSource(`/api/render/${jobId}/events`)

    const finish = (fn) => {
      source.close()
      fn()
    }

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data)

      if (payload.type === "start") {
        setProgress(`开始导出，共 ${payload.total} 篇…`)
      } else if (payload.type === "progress") {
        if (payload.phase === "fetch") {
          setProgress(
            `抓取 ${payload.index}/${payload.total}：${payload.title}`,
          )
        } else if (payload.coverTheme && ui.coverTheme.value === "auto") {
          setProgress(
            payload.coverTheme === "dark"
              ? "背景偏深，封面改用浅色文字"
              : "背景偏浅，封面使用深色文字",
          )
        } else {
          setProgress("正在排版并生成 PDF…")
        }
      } else if (payload.type === "done") {
        const parts = []
        if (payload.chapters) {
          parts.push(`${payload.chapters} 篇文档`)
        }
        if (payload.size) {
          parts.push(formatSize(payload.size))
        }
        if (payload.cached) {
          parts.push("复用上次结果")
        }
        setProgress(
          `完成：${payload.title || "手册"}${parts.length ? `（${parts.join("，")}）` : ""}`,
          "ok",
        )
        finish(() => resolve(jobId))
      } else if (payload.type === "error") {
        setProgress(`渲染失败：${payload.message}`, "error")
        finish(() => reject(new Error(payload.message)))
      }
    }

    source.onerror = () => {
      finish(() => reject(new Error("与本地服务的连接中断")))
    }
  })
}

/** 打开预览弹窗并生成（或复用）当前配置的 PDF。 */
async function showPreview() {
  if (state.selected.length === 0) {
    setProgress("请先选择至少一篇文档", "error")
    return
  }

  // 先开弹窗，让渲染过程有落脚点，而不是点完没反应。
  ui.previewFrame.src = "about:blank"
  openDialog()

  try {
    const jobId = await ensureRendered()
    const url = `/api/render/${jobId}/pdf`
    state.lastPdfUrl = url

    ui.previewFrame.src = `${url}#view=FitH`
    ui.previewTitle.textContent = ui.title.value.trim() || "PDF 预览"
    ui.previewMeta.textContent = `${state.selected.length} 篇文档`
  } catch (error) {
    setProgress(error.message, "error")
    closeDialog()
  }
}

function openDialog() {
  if (typeof ui.previewDialog.showModal === "function") {
    if (!ui.previewDialog.open) {
      ui.previewDialog.showModal()
    }
  } else {
    // 极老的浏览器兜底：至少别把内容藏起来。
    ui.previewDialog.setAttribute("open", "")
  }
}

function closeDialog() {
  // 停掉 iframe 里的 PDF 文档，避免关闭后仍占用内存。
  ui.previewFrame.src = "about:blank"
  if (typeof ui.previewDialog.close === "function") {
    ui.previewDialog.close()
  } else {
    ui.previewDialog.removeAttribute("open")
  }
}

ui.previewClose.addEventListener("click", closeDialog)
ui.downloadInDialog.addEventListener("click", downloadPdf)

// 点击遮罩（dialog 自身的空白区域）关闭。
ui.previewDialog.addEventListener("click", (event) => {
  if (event.target === ui.previewDialog) {
    closeDialog()
  }
})

ui.openTab.addEventListener("click", () => {
  if (state.lastPdfUrl) {
    window.open(state.lastPdfUrl, "_blank", "noopener")
  }
})

async function downloadPdf() {
  try {
    const jobId = await ensureRendered()
    // 服务端会带 Content-Disposition: attachment，这里触发一次下载即可。
    const anchor = document.createElement("a")
    anchor.href = `/api/render/${jobId}/pdf?download=1`
    anchor.download = ""
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setProgress("已开始下载 PDF")
  } catch (error) {
    setProgress(error.message, "error")
  }
}

/* ------------------------------------------------------------ 封面图片选择 */

/**
 * 「选择文件」按钮：把本地图片交给服务端落到 .manual-studio/assets/，
 * 再把相对路径填进输入框。这样输入框里始终是一个可读、可复用的路径，
 * 而不是一长串 base64。
 */
let pickTarget = ""

for (const button of document.querySelectorAll("[data-pick]")) {
  button.addEventListener("click", () => {
    pickTarget = button.dataset.pick
    ui.filePicker.value = ""
    ui.filePicker.click()
  })
}

ui.filePicker.addEventListener("change", async () => {
  const file = ui.filePicker.files?.[0]
  if (!file || !pickTarget) {
    return
  }

  setProgress(`正在保存 ${file.name}…`)
  try {
    const response = await fetch(
      `/api/upload?name=${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        // 带上文件自身的类型；拿不到时服务端会按文件内容判断。
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      },
    )
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    document.getElementById(pickTarget).value = data.path
    refreshImageHints()
    setProgress(
      data.deduped
        ? `已选用 ${file.name}（与已有图片相同，直接复用）`
        : `已选用 ${file.name}`,
    )
  } catch (error) {
    setProgress(`图片保存失败：${error.message}`, "error")
  }
})

/**
 * 刷新两个图片字段的缩略图与状态提示。
 *
 * 缩略图让「当前到底用的是哪张图」一目了然；文件不存在时直接标出来，
 * 而不是等到渲染才报错。
 */
async function refreshImageHints() {
  await Promise.all([
    updateImageField({
      input: ui.logo,
      preview: ui.logoPreview,
      note: ui.logoNote,
      emptyHint: "留空使用默认 GrapeCity 标识",
    }),
    updateImageField({
      input: ui.coverBg,
      preview: ui.coverBgPreview,
      note: ui.coverBgNote,
      emptyHint: "留空则纯白背景",
    }),
  ])
}

async function updateImageField({ input, preview, note, emptyHint }) {
  const value = input.value.trim()

  if (!value) {
    preview.hidden = true
    preview.removeAttribute("src")
    note.hidden = true
    note.textContent = ""
    note.className = "file-note"
    return
  }

  // 网址直接交给浏览器加载，本地路径走服务端读取接口。
  const src = /^(https?:|data:)/i.test(value)
    ? value
    : `/api/assets/${encodeURIComponent(basename(value))}`

  const status = await probeImage(src)
  if (status.ok) {
    preview.src = src
    preview.hidden = false
    note.hidden = false
    note.className = "file-note"
    note.textContent = describeImage(value, status)
  } else {
    preview.hidden = true
    preview.removeAttribute("src")
    note.hidden = false
    note.className = "file-note file-note--error"
    note.textContent =
      value.startsWith("/") || /^https?:/i.test(value)
        ? `无法加载：${value}`
        : `找不到文件：${value}${emptyHint ? `（${emptyHint}）` : ""}`
  }
}

function basename(value) {
  return value.split(/[\\/]/).pop() ?? value
}

function describeImage(value, status) {
  const size =
    status.width && status.height ? `${status.width}×${status.height}` : ""
  const isAsset = value.includes(".manual-studio/assets/")
  const parts = [isAsset ? "已保存到工作目录" : "外部引用", size].filter(
    Boolean,
  )
  return parts.join(" · ")
}

/** 探测图片能否加载，拿到原始尺寸用于提示。 */
function probeImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () =>
      resolve({ ok: true, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ ok: false })
    img.src = src
  })
}

/* ------------------------------------------------------------ 预设导出导入 */

ui.presetExport.addEventListener("click", async () => {
  if (state.presets.length === 0) {
    setProgress("还没有预设可以导出。", "error")
    return
  }

  // 服务端会把引用的图片内联进 JSON，导出的文件是自包含的备份。
  const anchor = document.createElement("a")
  anchor.href = "/api/presets/export"
  anchor.download = ""
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setProgress(`已导出 ${state.presets.length} 个预设（图片已内嵌）`)
})

ui.presetImport.addEventListener("click", () => {
  ui.presetPicker.value = ""
  ui.presetPicker.click()
})

ui.presetPicker.addEventListener("change", async () => {
  const file = ui.presetPicker.files?.[0]
  if (!file) {
    return
  }

  setProgress(`正在导入 ${file.name}…`)
  try {
    const text = await file.text()
    const response = await fetch("/api/presets/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: text,
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    state.presets = Array.isArray(data.presets) ? data.presets : []
    renderPresets()
    setProgress(`已导入 ${data.imported} 个预设`)
  } catch (error) {
    setProgress(`导入失败：${error.message}`, "error")
  }
})

/* ---------------------------------------------------------------- 启动 */

ui.preview.addEventListener("click", showPreview)
ui.download.addEventListener("click", downloadPdf)
ui.reload.addEventListener("click", () => loadDocs({ refresh: true }))
ui.baseUrl.addEventListener("change", () => loadDocs({ refresh: true }))

function init() {
  ui.date.type = "date"
  ui.date.value = today()
  ui.baseUrl.value =
    localStorage.getItem("manual-studio:baseUrl") ||
    window.location.origin.replace(/:\d+$/, ":3000")

  // 手动改路径后也要刷新缩略图与存在性提示。
  for (const input of [ui.logo, ui.coverBg]) {
    input.addEventListener("change", refreshImageHints)
  }

  refreshImageHints()
  loadPresets()
  loadDocs()
}

init()
