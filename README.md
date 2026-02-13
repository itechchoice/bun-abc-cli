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

## Interactive Shell Mode

`abc` 会进入交互壳（OpenTUI），在输入框里直接输入命令或普通文本。

快捷命令：

- `/login`
- `/whoami`
- `/logout`
- `/mcp`（等价于 `mcp list`）

手动命令：

- `mcp add --server-code weather_mcp --url http://127.0.0.1:9001 --version v0`
- `mcp get weather_mcp`
- `run submit --objective "查 San Francisco 三日天气"`
- `run status <execution_id>`
- `run events --follow <execution_id>`
- `run artifacts <execution_id>`
- `run result <execution_id>`

登录持久化：

- 仅持久化 token（`~/.abc-cli/auth-token.json`）
- 启动时自动校验 token；失败则清除并提示重新登录
- `/logout` 会清除本地 token

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
