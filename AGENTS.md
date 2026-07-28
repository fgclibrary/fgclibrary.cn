## 默认语言

- 沟通、项目文档和界面文案默认使用简体中文。
- 代码标识符、文件名、命令和专有名称保持原文。
- 若任务明确指定其他语言，以任务要求为准。

## Next.js

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## shadcn/ui

- 默认通过 shadcn CLI 添加组件，不凭记忆直接编写组件源码。
- 更新已有组件前先使用 shadcn CLI 的 `--dry-run` 和 `--diff` 查看影响；不要直接从远程复制组件源码。
- 不自动格式化或顺带改写 shadcn 默认组件。

## 变更原则

- 保持变更范围聚焦，不顺带重构无关代码。
- 修改后执行与变更风险相称的检查。
