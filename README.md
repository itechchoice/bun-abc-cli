# abc-cli

`abc-cli` 是一个基于 `OpenTUI + React + TypeScript + Bun` 的终端产品原型。

## Requirements

- Bun
- zsh（Ghostty 默认）

## Local Development

```bash
bun install
bun run dev
```

类型检查：

```bash
bun run typecheck
```

## Run in Repo

```bash
bun run start
# or
bun run src/index.tsx
```

## Global Install From GitHub

将 `<owner>/<repo>` 替换为你的实际仓库：

```bash
bun add -g github:<owner>/<repo>
```

安装后检查：

```bash
which abc
abc
```

## Ghostty / zsh PATH

如果 `which abc` 找不到命令，把 Bun 全局 bin 加入 PATH：

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

持久化到 `~/.zshrc`：

```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Upgrade

重复安装命令即可覆盖升级：

```bash
bun add -g github:<owner>/<repo>
```

## Uninstall

```bash
bun remove -g abc-cli
```

## Homebrew Install (发布后)

### 方式 1：通过 tap（推荐）

```bash
brew install <owner>/cli/abc
```

要求 tap 仓库名为 `homebrew-cli`（`homebrew-` 前缀会在命令中省略）：

```bash
brew install <owner>/cli/abc
```

### 方式 2：直接安装公式 URL（无需 tap）

```bash
brew install --formula https://raw.githubusercontent.com/<owner>/homebrew-cli/main/Formula/abc.rb
```

> 当前仓库已内置发布脚本与 GitHub Actions（tag `v*` 自动构建二进制并生成 `abc.rb`）。
> 详细步骤见：`doc/homebrew-distribution.md`

## UX Notes

- 启动时固定显示 Greeting Banner（非阻塞）。
- 默认命令名为 `abc`。
- 当前 CLI 模式是 `Interaction Surface + Read-only Observation`：
  - 输入仅用于提交 `Business Contract`
  - 执行中仅观察，不提供执行控制

## Business Contract Input

支持两种输入方式：

1. 纯文本（作为 objective）：

```text
Summarize last deployment logs.
```

2. 显式字段：

```text
objective: summarize deployment logs
context_refs: ref://deploy/logs,ref://release/2026-02-12
constraints: read_only,no_destructive
execution_strategy: once
```

`execution_strategy` 可选值：
- `once`
- `max_runs:3`
- `cron:0 */2 * * *`
- `until_condition:...`

## Observation Demo

Mock provider 支持用 objective 标记终态：
- 包含 `[fail]` 会进入 `FAILED`
- 包含 `[cancel]` 会进入 `CANCELLED`
