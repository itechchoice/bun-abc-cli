# AGENTS.md

## 规范关键词

本文使用 RFC2119 术语：
- `MUST` / `MUST NOT`：硬性要求，必须遵守。
- `SHOULD` / `SHOULD NOT`：强建议，除非有明确理由。
- `MAY`：可选。

## MUST

- 技术栈 `MUST` 保持为 `OpenTUI + React + TypeScript + Bun`。
- 项目运行、依赖安装、脚本执行 `MUST` 默认使用 Bun（`bun install` / `bun run` / `bunx`）。
- UI 与交互实现 `MUST` 优先使用 `@opentui/react` / `@opentui/core` 现成组件。
- 在新增 UI（尤其是输入、选择、列表、滚动、状态提示）前，`MUST` 先通过 Context7 查询 OpenTUI 官方文档确认是否有现成组件。
- 若现成组件不满足，`MUST` 先尝试“组合现有组件”再考虑手搓组件。
- 新增第三方库前，`MUST` 先确认在 Bun 下可运行再接入项目。
- 任何可能影响技术栈方向的改动（如移除 OpenTUI、改为纯 Node CLI）`MUST` 先征得用户明确同意。
- 用户背景 `MUST` 被持续考虑：用户熟悉 React 18，但无纯 CLI（非组件化）开发经验。
- 当前项目来源 `MUST` 被尊重：`bun create tui --template react`。

## SHOULD

- 功能实现 `SHOULD` 采用 React 组件化与渐进增强方式，而非大规模重写。
- 若提出替代方案，`SHOULD` 作为可选项给出，默认不执行。
- 若最终使用手搓组件，提交说明 `SHOULD` 包含：
  - 已评估的 OpenTUI 组件清单；
  - 不满足需求的原因；
  - 手搓实现边界与后续可替换方案。

## MUST NOT

- 未经用户明确同意，`MUST NOT` 擅自移除或替换 OpenTUI 技术栈。
- `MUST NOT` 仅为“实现更快”而跳过 OpenTUI 现成组件直接手搓。
- `MUST NOT` 默认切换到 npm / yarn / pnpm。

## References

- OpenTUI React 文档：`https://opentui.com/docs/bindings/react`
- OpenTUI GitHub：`https://github.com/anomalyco/opentui`
- Bun 文档：`https://bun.com/docs`
