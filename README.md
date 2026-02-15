# abc-cli

`abc-cli` 是一个基于 `OpenTUI + React + TypeScript + Bun` 的交互壳 CLI，当前按 `requirements/PLATFORM_API.md` 直连后端接口。

## Requirements

- Bun

## Local Development

```bash
bun install
bun run dev
```

类型检查：

```bash
bun run typecheck
```

测试：

```bash
bun test
```

## Run

```bash
bun run start
# or
bun run src/index.tsx
```

## Interactive Shell

启动：

```bash
abc
```

Slash 命令：

- `/login`
- `/mcp`
- `/logout`
- `/exit`

手动命令（核心）：

- `theme list`
- `theme current`
- `theme set light-hc`
- `mcp add --server-code weather_mcp --url http://127.0.0.1:9001 --version v0`
- `mcp list`
- `mcp get <id>`
- `session create --title "天气会话"`
- `run submit --objective "查 San Francisco 三日天气"`
- `run status <task_id>`
- `run events --follow <task_id>`
- `run artifacts <task_id>`
- `run cancel <task_id>`

完整命令契约见：`requirements/cli-command.md`。

## Theme Support

- 支持两套主题：`dark`、`light-hc`
- 运行时切换：
  - `theme list`
  - `theme current`
  - `theme set <name>`
- 主题持久化路径：`~/.abc-cli/theme.json`
- 启动优先级：`ABC_THEME` > 本地 theme 文件 > 默认 `dark`

## Output Contract

所有后端调用（成功或失败）都会输出：

1. `> METHOD /path`
2. `< STATUS <code>`
3. 返回体 JSON（pretty print）

SSE 事件流逐条输出：

```json
{"event":"task.created","data":{"task_id":20001,"status":"CREATED"}}
```

## Token Persistence

- 仅持久化 `access_token`
- 路径：`~/.abc-cli/auth-token.json`
- 目录权限：`700`
- 文件权限：`600`
- 启动时自动探活 token；失效自动清理并提示重新 `/login`

## Global Install From GitHub

```bash
bun add -g github:<owner>/<repo>
```

安装后：

```bash
which abc
abc
```
