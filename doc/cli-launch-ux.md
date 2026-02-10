# abc 启动体验设计记录（Greeting + 全局命令）

- 记录时间：2026-02-10
- 项目：`/Users/hejin/Documents/happy-2026/abc-cli`
- 技术栈：`OpenTUI + React + TypeScript + Bun`

## 目标

1. 提供有产品感的 Greeting（参考 gemini-cli 风格）。
2. 在 Ghostty 终端中可直接输入 `abc` 启动应用。

## 决策

1. Greeting：每次启动显示。
2. Greeting 风格：ASCII Logo + 占位品牌文案。
3. Greeting 行为：顶部非阻塞显示，不拦截输入焦点。
4. 命令名：固定为 `abc`。
5. 分发方式：优先支持 `bun add -g github:<owner>/<repo>`。

## 技术落地

1. `package.json` 新增：
- `bin: { "abc": "./bin/abc" }`
- `scripts.start`
- `scripts.typecheck`

2. 新增可执行入口：
- `bin/abc`
- Shebang：`#!/usr/bin/env bun`
- 入口加载：`src/index.tsx`

3. UI 新增：
- `src/ui/GreetingBanner.tsx`
- 在 `AppShell` 顶部接入，默认常驻显示

## 验收标准

1. `bun run typecheck` 通过。
2. 本地 `bun run start` 启动后可见 greeting，且可立即输入。
3. 全局安装后 `which abc` 可定位到 Bun 全局 bin，`abc` 可启动。

## 风险与应对

1. PATH 未配置导致命令不可见：
- 在 README 明确 `~/.bun/bin` PATH 方案。

2. 终端宽度不足导致 banner 换行：
- greeting 文案保持短句，避免宽文本。
