# AGENTS.md

## 用户明确要求（必须遵守）

- 用户是熟悉 `React 18` 的前端开发者。
- 用户没有纯 CLI（非 React/非组件化）的开发经验。
- 当前项目是通过 `bun create tui --template react` 创建的。
- 当前项目运行时、包管理、脚本执行统一使用 `Bun`。
- 选择 OpenTUI 的核心原因是：
  - `Build terminal user interfaces using React with familiar patterns and components`
- 后续开发必须保留并基于 `OpenTUI + React` 技术栈进行。
- 未经用户明确同意，不得擅自移除或替换 OpenTUI 技术栈。

## 助手理解与执行原则

- Bun-first：默认使用 `bun install`、`bun run`、`bunx`，不要默认切换到 npm/yarn/pnpm。
- 新增第三方库前，需先确认在 Bun 下可运行，再接入项目。
- 默认技术方向：`@opentui/react` + `@opentui/core` + React 组件化开发。
- 完整技术栈基线：`OpenTUI + React + TypeScript + Bun`。
- 设计 CLI 产品能力时，应优先通过 OpenTUI 的 React 模式实现交互与界面。
- 任何可能影响技术栈的改动（例如移除 OpenTUI、改成纯 Node CLI）都必须先征得用户确认。
- 如需给出替代方案，可以提出，但只能作为可选项，且默认不执行。
- 后续代码修改以“保留现有 OpenTUI 基础并渐进增强”为原则。
- 任何技术问题都可以通过 Context7 查询官方/权威文档后再实施。
- Framework bindings (React) 文档地址：`https://opentui.com/docs/bindings/react`
- OpenTUI GitHub 地址：`https://github.com/anomalyco/opentui`
- Bun 文档地址：`https://bun.com/docs`
