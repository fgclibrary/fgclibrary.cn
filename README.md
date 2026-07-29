# 格言格语（fgclibrary）

格言格语项目网站。

## 内置能力

- Next.js App Router、React 和 TypeScript
- Tailwind CSS 与 shadcn/ui（Base UI）
- Biome 代码检查与格式化
- 本地 Geist 字体与中文系统字体回退
- 深色模式
- Node.js 版本约束
- GitHub Actions 持续集成

## 本地开发

```bash
nvm use
npm ci
npm run dev
```

开发服务器默认运行在 [http://localhost:3000](http://localhost:3000)。

## 常用命令

```bash
npm run dev          # 启动开发服务器
npm run check        # 检查格式、代码质量和导入
npm run check:write  # 自动修复 Biome 可处理的问题
npm run typecheck    # 执行 TypeScript 类型检查
npm run build        # 执行生产构建
npm run start        # 启动生产服务器
```

## 添加 shadcn 组件

通过 shadcn CLI 添加组件：

```bash
npx shadcn@latest add <component>
```

组件会添加到 `components/ui`。该目录已从 Biome 的检查和格式化范围中排除，方便后续通过 CLI 更新。

Agent 协作约定见 [AGENTS.md](./AGENTS.md)。
