# Next Shadcn Starter

面向中文 Next.js 项目的轻量初始工程。

## 内置能力

- Next.js App Router、React 和 TypeScript
- Tailwind CSS 与 shadcn/ui（Base UI）
- Biome 代码检查与格式化
- 本地 Geist 字体与中文系统字体回退
- 深色模式
- Node.js 版本约束
- GitHub Actions 持续集成

## 使用模板

点击仓库页面的 **Use this template** 创建新仓库，然后执行：

```bash
git clone <新仓库地址>
cd <新项目目录>
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

## 创建项目后

- 修改 `package.json` 中的项目名称和版本。
- 重写本 README，使其描述实际项目。
- 设置 Metadata、favicon 和首页内容。
- 按需调整主题颜色与字体。
- 补充环境变量示例和部署配置。
- 删除不需要的演示内容与依赖。

Agent 协作约定见 [AGENTS.md](./AGENTS.md)。
